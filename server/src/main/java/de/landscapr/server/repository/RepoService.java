package de.landscapr.server.repository;

import de.landscapr.server.apiCall.ApiCall;
import de.landscapr.server.apiCall.ApiCallRepository;
import de.landscapr.server.application.Application;
import de.landscapr.server.application.ApplicationRepository;
import de.landscapr.server.capability.Capability;
import de.landscapr.server.capability.CapabilityRepository;
import de.landscapr.server.process.Process;
import de.landscapr.server.process.ProcessRepository;
import de.landscapr.server.process.Step;
import de.landscapr.server.process.StepSuccessor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RepoService {


    private final RepoRepository repoRepository;
    private final ApplicationRepository applicationRepository;
    private final CapabilityRepository capabilityRepository;
    private final ApiCallRepository apiCallRepository;
    private final ProcessRepository processRepository;

    public RepoService(RepoRepository repoRepository, ApplicationRepository applicationRepository, CapabilityRepository capabilityRepository, ApiCallRepository apiCallRepository, ProcessRepository processRepository) {
        this.repoRepository = repoRepository;
        this.applicationRepository = applicationRepository;
        this.capabilityRepository = capabilityRepository;
        this.apiCallRepository = apiCallRepository;
        this.processRepository = processRepository;
    }

    public void delete(String repoId) {
        Optional<Repo> repo = repoRepository.findById(repoId);
        if(repo.isPresent()) {

            applicationRepository.deleteByRepoId(repoId);
            capabilityRepository.deleteByRepoId(repoId);
            apiCallRepository.deleteByRepoId(repoId);
            processRepository.deleteByRepoId(repoId);
            repoRepository.delete(repo.get());
        }
    }

    public void copy(String repoId, String name) {
        Optional<Repo> repo = repoRepository.findById(repoId);
        if(repo.isPresent()) {

            Map<String, String> applicationIdMap = new HashMap<>();
            Map<String, String> capabilityIdMap = new HashMap<>();
            Map<String, String> apiCallIdMap = new HashMap<>();
            Map<String, String> processIdMap = new HashMap<>();


            Repo copy = new Repo();
            copy.setName(name);
            copy.setDescription(repo.get().getDescription());
            copy = repoRepository.save(copy);

            for (Application application : applicationRepository.findAll(repoId)) {
                String currentId = application.getId();
                application.setId(null);
                application.setRepoId(copy.getId());
                application = applicationRepository.save(application);
                applicationIdMap.put(currentId, application.getId());
            }

            for (Capability capability : capabilityRepository.findAll(repoId)) {
                String currentId = capability.getId();
                capability.setId(null);
                capability.setRepoId(copy.getId());
                if(capability.getImplementedBy() != null) {
                    capability.setImplementedBy(capability.getImplementedBy().stream().map(applicationIdMap::get).collect(Collectors.toList()));
                }
                capability = capabilityRepository.save(capability);
                capabilityIdMap.put(currentId, capability.getId());
            }

            for (ApiCall apiCall : apiCallRepository.findAll(repoId)) {
                String currentId = apiCall.getId();
                apiCall.setId(null);
                apiCall.setRepoId(copy.getId());
                if(apiCall.getCapabilityId() != null) {
                    apiCall.setCapabilityId(capabilityIdMap.get(apiCall.getCapabilityId()));
                }
                if(apiCall.getImplementedBy() != null) {
                    apiCall.setImplementedBy(apiCall.getImplementedBy().stream().map(applicationIdMap::get).collect(Collectors.toList()));
                }
                apiCall = apiCallRepository.save(apiCall);
                apiCallIdMap.put(currentId, apiCall.getId());
            }

            for (Process process : processRepository.findAll(repoId)) {
                String currentId = process.getId();
                process.setId(null);
                process.setRepoId(copy.getId());
                if(process.getImplementedBy() != null) {
                    process.setImplementedBy(process.getImplementedBy().stream().map(applicationIdMap::get).collect(Collectors.toList()));
                }

                if(process.getApiCallIds() != null) {
                    process.setApiCallIds(process.getApiCallIds().stream().map(apiCallIdMap::get).collect(Collectors.toList()));
                }
                process = processRepository.save(process);
                processIdMap.put(currentId, process.getId());
            }

            for (Process process : processRepository.findAll(copy.getId())) {
                if(process.getSteps() != null) {
                    for (Step step : process.getSteps()) {
                        step.setProcessReference(processIdMap.get(step.getProcessReference()));
                        if(step.getSuccessors() != null) {
                            for (StepSuccessor successor : step.getSuccessors()) {
                                successor.setProcessReference(processIdMap.get(successor.getProcessReference()));
                            }
                        }
                    }
                }
                processRepository.save(process);
            }
        }
    }
}
