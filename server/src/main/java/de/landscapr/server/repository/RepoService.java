package de.landscapr.server.repository;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonGenerator;
import com.google.gson.JsonArray;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;
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
import org.apache.commons.collections4.ListUtils;
import org.springframework.stereotype.Service;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
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




            Repo copy = new Repo();
            copy.setName(name);
            copy.setDescription(repo.get().getDescription());
            copy = repoRepository.save(copy);

            List<Application> applications = applicationRepository.findAll(repoId);
            List<Capability> capabilities = capabilityRepository.findAll(repoId);
            List<ApiCall> apiCalls = apiCallRepository.findAll(repoId);
            List<Process> processes = processRepository.findAll(repoId);

            importData(copy.getId(), applications, capabilities, apiCalls, processes);
        }
    }

    private void importData(String repoId, List<Application> applications, List<Capability> capabilities, List<ApiCall> apiCalls, List<Process> processes) {
        Map<String, String> applicationIdMap = new HashMap<>();
        Map<String, String> capabilityIdMap = new HashMap<>();
        Map<String, String> apiCallIdMap = new HashMap<>();
        Map<String, String> processIdMap = new HashMap<>();
        for (Application application : ListUtils.emptyIfNull(applications)) {
            String currentId = application.getId();
            application.setId(null);
            application.setRepoId(repoId);
            application = applicationRepository.save(application);
            applicationIdMap.put(currentId, application.getId());
        }

        for (Capability capability : ListUtils.emptyIfNull(capabilities)) {
            String currentId = capability.getId();
            capability.setId(null);
            capability.setRepoId(repoId);
            if(capability.getImplementedBy() != null) {
                capability.setImplementedBy(capability.getImplementedBy().stream().map(applicationIdMap::get).collect(Collectors.toList()));
            }
            capability = capabilityRepository.save(capability);
            capabilityIdMap.put(currentId, capability.getId());
        }

        for (ApiCall apiCall : ListUtils.emptyIfNull(apiCalls)) {
            String currentId = apiCall.getId();
            apiCall.setId(null);
            apiCall.setRepoId(repoId);
            if(apiCall.getCapabilityId() != null) {
                apiCall.setCapabilityId(capabilityIdMap.get(apiCall.getCapabilityId()));
            }
            if(apiCall.getImplementedBy() != null) {
                apiCall.setImplementedBy(apiCall.getImplementedBy().stream().map(applicationIdMap::get).collect(Collectors.toList()));
            }
            apiCall = apiCallRepository.save(apiCall);
            apiCallIdMap.put(currentId, apiCall.getId());
        }

        for (Process process : ListUtils.emptyIfNull(processes)) {
            String currentId = process.getId();
            process.setId(null);
            process.setRepoId(repoId);
            if(process.getImplementedBy() != null) {
                process.setImplementedBy(process.getImplementedBy().stream().map(applicationIdMap::get).collect(Collectors.toList()));
            }

            if(process.getApiCallIds() != null) {
                process.setApiCallIds(process.getApiCallIds().stream().map(apiCallIdMap::get).collect(Collectors.toList()));
            }
            process = processRepository.save(process);
            processIdMap.put(currentId, process.getId());
        }

        for (Process process : processRepository.findAll(repoId)) {
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

    public void downloadJson(String repoId, HttpServletResponse response) throws IOException {
        JsonFactory jFactory = new JsonFactory();
        JsonGenerator generator = jFactory.createGenerator(response.getOutputStream());
        generator.useDefaultPrettyPrinter();
        generator.writeStartObject();
        exportApplicationsAsJson(generator, applicationRepository.findAll(repoId));
        exportCapabilitiesAsJson(generator, capabilityRepository.findAll(repoId));
        exportApiCallsAsJson(generator, apiCallRepository.findAll(repoId));
        exportProcessesAsJson(generator, processRepository.findAll(repoId));

        generator.writeEndObject();

        generator.flush();
        generator.close();
        response.getOutputStream().flush();
        response.getOutputStream().close();
    }

    private void exportApplicationsAsJson(JsonGenerator generator, List<Application> list) throws IOException {
        generator.writeFieldName("applications");
        generator.writeStartArray();
        for (Application item : list) {
            generator.writeStartObject();
            generator.writeStringField("id", item.getId());
            generator.writeStringField("logicalId", item.getLogicalId());
            generator.writeStringField("name", item.getName());
            generator.writeStringField("description", item.getDescription());
            generator.writeStringField("contact", item.getContact());
            generator.writeStringField("url", item.getUrl());
            generator.writeStringField("systemCluster", item.getSystemCluster());
            generator.writeFieldName("tags");
            generator.writeStartArray();
            for (String tag : ListUtils.emptyIfNull(item.getTags())) {
                generator.writeString(tag);
            }
            generator.writeEndArray();
            generator.writeNumberField("status", item.getStatus() == null ? 0 : item.getStatus());
            generator.writeEndObject();
        }
        generator.writeEndArray();
    }

    private List<Application> parseApplications(JsonObject importData) {
        JsonArray arr = importData.getAsJsonArray("applications");
        List<Application> result = new ArrayList<>();
        for(int i = 0; i < arr.size(); i++) {
            JsonObject item = arr.get(i).getAsJsonObject();
            Application application = new Application();

            application.setId(getAsString(item, "id"));
            application.setLogicalId(getAsString(item, "logicalId"));
            application.setName(getAsString(item, "name"));
            application.setDescription(getAsString(item, "description"));
            application.setContact(getAsString(item, "contact"));
            application.setUrl(getAsString(item, "url"));
            application.setSystemCluster(getAsString(item, "systemCluster"));
            application.setTags(getAsStringList(item, "tags"));
            application.setStatus(getAsInt(item,"status"));
            result.add(application);
        }
        return result;
    }



    private void exportCapabilitiesAsJson(JsonGenerator generator, List<Capability> list) throws IOException {
        generator.writeFieldName("capabilities");
        generator.writeStartArray();
        for (Capability item : list) {
            generator.writeStartObject();
            generator.writeStringField("id", item.getId());
            generator.writeStringField("logicalId", item.getLogicalId());
            generator.writeStringField("name", item.getName());
            generator.writeStringField("description", item.getDescription());
            generator.writeFieldName("implementedBy");
            generator.writeStartArray();
            for (String implementedBy : ListUtils.emptyIfNull(item.getImplementedBy())) {
                generator.writeString(implementedBy);
            }
            generator.writeEndArray();
            generator.writeNumberField("status", item.getStatus() == null ? 0 : item.getStatus());
            generator.writeFieldName("tags");
            generator.writeStartArray();
            for (String tag : ListUtils.emptyIfNull(item.getTags())) {
                generator.writeString(tag);
            }
            generator.writeEndArray();
            generator.writeEndObject();
        }
        generator.writeEndArray();
    }

    private List<Capability> parseCapabilities(JsonObject importData) {
        JsonArray arr = importData.getAsJsonArray("capabilities");
        List<Capability> result = new ArrayList<>();
        for(int i = 0; i < arr.size(); i++) {
            JsonObject item = arr.get(i).getAsJsonObject();
            Capability capability = new Capability();
            capability.setId(getAsString(item, "id"));
            capability.setLogicalId(getAsString(item, "logicalId"));
            capability.setName(getAsString(item, "name"));
            capability.setDescription(getAsString(item, "description"));
            capability.setImplementedBy(getAsStringList(item, "implementedBy"));
            capability.setStatus(getAsInt(item,"status"));
            capability.setTags(getAsStringList(item, "tags"));
            result.add(capability);
        }
        return result;
    }

    private void exportApiCallsAsJson(JsonGenerator generator, List<ApiCall> list) throws IOException {
        generator.writeFieldName("apiCalls");
        generator.writeStartArray();
        for (ApiCall item : list) {
            generator.writeStartObject();
            generator.writeStringField("id", item.getId());
            generator.writeStringField("logicalId", item.getLogicalId());
            generator.writeStringField("name", item.getName());
            generator.writeStringField("description", item.getDescription());
            generator.writeStringField("implementationStatus", item.getImplementationStatus());
            generator.writeStringField("docLinkUrl", item.getDocLinkUrl());
            generator.writeStringField("capabilityId", item.getCapabilityId());
            generator.writeFieldName("implementedBy");
            generator.writeStartArray();
            for (String implementedBy : ListUtils.emptyIfNull(item.getImplementedBy())) {
                generator.writeString(implementedBy);
            }
            generator.writeEndArray();

            generator.writeStringField("input", item.getInput());
            generator.writeStringField("output", item.getOutput());

            generator.writeFieldName("tags");
            generator.writeStartArray();
            for (String tag : ListUtils.emptyIfNull(item.getTags())) {
                generator.writeString(tag);
            }
            generator.writeEndArray();
            generator.writeNumberField("implementationType", item.getImplementationType());
            generator.writeNumberField("status", item.getStatus() == null ? 0 : item.getStatus());
            generator.writeEndObject();
        }
        generator.writeEndArray();
    }

    private List<ApiCall> parseApiCalls(JsonObject importData) {
        JsonArray arr = importData.getAsJsonArray("apiCalls");
        List<ApiCall> result = new ArrayList<>();
        for(int i = 0; i < arr.size(); i++) {
            JsonObject item = arr.get(i).getAsJsonObject();
            ApiCall apiCall = new ApiCall();
            apiCall.setId(getAsString(item, "id"));
            apiCall.setLogicalId(getAsString(item, "logicalId"));
            apiCall.setName(getAsString(item, "name"));
            apiCall.setDescription(getAsString(item, "description"));
            apiCall.setImplementationStatus(getAsString(item, "implementationStatus"));
            apiCall.setDocLinkUrl(getAsString(item, "docLinkUrl"));
            apiCall.setCapabilityId(getAsString(item, "capabilityId"));
            apiCall.setImplementedBy(getAsStringList(item, "implementedBy"));
            apiCall.setInput(getAsString(item, "input"));
            apiCall.setOutput(getAsString(item, "output"));
            apiCall.setTags(getAsStringList(item, "tags"));
            apiCall.setImplementationType(getAsInt(item,"implementationType"));
            apiCall.setStatus(getAsInt(item,"status"));
            result.add(apiCall);
        }
        return result;
    }

    private void exportProcessesAsJson(JsonGenerator generator, List<Process> list) throws IOException {
        generator.writeFieldName("processes");
        generator.writeStartArray();
        for (Process item : list) {
            generator.writeStartObject();
            generator.writeStringField("id", item.getId());
            generator.writeStringField("logicalId", item.getLogicalId());
            generator.writeStringField("name", item.getName());
            generator.writeStringField("description", item.getDescription());
            generator.writeNumberField("status", item.getStatus() == null ? 0 : item.getStatus());
            generator.writeStringField("input", item.getInput());
            generator.writeStringField("output", item.getOutput());
            generator.writeFieldName("tags");
            generator.writeStartArray();
            for (String tag : ListUtils.emptyIfNull(item.getTags())) {
                generator.writeString(tag);
            }
            generator.writeEndArray();
            generator.writeNumberField("role", item.getRole());
            generator.writeFieldName("steps");
            generator.writeStartArray();
            for (Step step : ListUtils.emptyIfNull(item.getSteps())) {
                generator.writeStartObject();
                generator.writeStringField("processReference", step.getProcessReference());
                generator.writeFieldName("successors");
                generator.writeStartArray();
                for (StepSuccessor successor : ListUtils.emptyIfNull(step.getSuccessors())) {
                    generator.writeStringField("processReference", successor.getProcessReference());
                    generator.writeStringField("edgeTitle", successor.getEdgeTitle());
                }
                generator.writeEndArray();
                generator.writeEndObject();
            }
            generator.writeEndArray();

            generator.writeFieldName("apiCallIds");
            generator.writeStartArray();
            for (String apiCall : ListUtils.emptyIfNull(item.getApiCallIds())) {
                generator.writeString(apiCall);
            }
            generator.writeEndArray();
            generator.writeBooleanField("favorite", item.isFavorite());
            generator.writeFieldName("implementedBy");
            generator.writeStartArray();
            for (String implementedBy : ListUtils.emptyIfNull(item.getImplementedBy())) {
                generator.writeString(implementedBy);
            }
            generator.writeEndArray();


            generator.writeEndObject();
        }
        generator.writeEndArray();
    }

    private List<Process> parseProcesses(JsonObject importData) {
        JsonArray arr = importData.getAsJsonArray("processes");
        List<Process> result = new ArrayList<>();
        for(int i = 0; i < arr.size(); i++) {
            JsonObject item = arr.get(i).getAsJsonObject();
            Process process = new Process();
            process.setId(getAsString(item, "id"));
            process.setLogicalId(getAsString(item, "logicalId"));
            process.setName(getAsString(item, "name"));
            process.setDescription(getAsString(item, "description"));
            process.setStatus(getAsInt(item,"status"));
            process.setInput(getAsString(item, "input"));
            process.setOutput(getAsString(item, "output"));
            process.setTags(getAsStringList(item, "tags"));
            process.setRole( getAsInt(item,"status"));
            //Steps
            process.setSteps(new ArrayList<>());
            if(item.has("steps") && item.get("steps") != JsonNull.INSTANCE) {
                JsonArray stepArr = item.getAsJsonArray("steps");
                for (int j = 0; j < stepArr.size(); j++) {
                    JsonObject jsonStep = stepArr.get(j).getAsJsonObject();
                    Step step = new Step();
                    step.setProcessReference(getAsString(jsonStep, "processReference"));
                    step.setSuccessors(new ArrayList<>());
                    JsonArray succArr = item.getAsJsonArray("steps");
                    for (int k = 0; k < succArr.size(); k++) {
                        JsonObject jsonSucc = succArr.get(k).getAsJsonObject();
                        StepSuccessor succ = new StepSuccessor();
                        succ.setProcessReference(getAsString(jsonSucc, "processReference"));
                        succ.setEdgeTitle(getAsString(jsonSucc, "edgeTitle"));
                        step.getSuccessors().add(succ);
                    }
                    process.getSteps().add(step);
                }
            }

            process.setApiCallIds(getAsStringList(item, "apiCallIds"));
            process.setFavorite(Boolean.TRUE.equals(getAsBoolean(item, "favorite")));
            process.setImplementedBy(getAsStringList(item, "implementedBy"));
            result.add(process);
        }
        return result;
    }

    public void importFromJson(String repoId, JsonObject importData) {
        List<Application> applications = parseApplications(importData);
        List<Capability> capabilities = parseCapabilities(importData);
        List<ApiCall> apiCalls = parseApiCalls(importData);
        List<Process> processes = parseProcesses(importData);

        importData(repoId, applications, capabilities, apiCalls, processes);
    }

    private String getAsString(JsonObject item, String name) {
        if(item.has(name) && item.get(name) != JsonNull.INSTANCE) {
            return item.getAsJsonPrimitive(name).getAsString();
        }
        return null;
    }

    private Integer getAsInt(JsonObject item, String name) {
        if(item.has(name) && item.get(name) != JsonNull.INSTANCE) {
            return item.getAsJsonPrimitive(name).getAsInt();
        }
        return null;
    }

    private Boolean getAsBoolean(JsonObject item, String name) {
        if(item.has(name) && item.get(name) != JsonNull.INSTANCE) {
            return item.getAsJsonPrimitive(name).getAsBoolean();
        }
        return null;
    }

    private List<String> getAsStringList(JsonObject item, String name) {
        List<String> result = new ArrayList<>();
        if(item.has(name) && item.get(name) != JsonNull.INSTANCE) {
            JsonArray tagArr = item.getAsJsonArray(name);
            for (int j = 0; j < tagArr.size(); j++) {
                if(tagArr.get(j) != JsonNull.INSTANCE) {
                    result.add(tagArr.get(j).getAsString());
                }
            }
        }
        return result;
    }
}
