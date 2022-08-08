package de.landscapr.server.process;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

@RestController
public class ProcessController {

    private final ProcessRepository processRepository;

    public ProcessController(ProcessRepository processRepository) {
        this.processRepository = processRepository;
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/process/all/{repoId}")
    public ResponseEntity<List<Process>> all(@PathVariable String repoId) {
        return ResponseEntity.ok(processRepository.findAll(repoId));
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/process/allFavorites/{repoId}")
    public ResponseEntity<List<Process>> allFavorites(@PathVariable String repoId) {
        return ResponseEntity.ok(processRepository.findAllFavorites(repoId));
    }

    @RequestMapping(method = RequestMethod.POST, value = "/api/process/byIds")
    public ResponseEntity<List<Process>> byIds(@RequestBody List<String> processIds) {
        return ResponseEntity.ok(processRepository.byIds(processIds));
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/process/allParent/{repoId}/{processId}")
    public ResponseEntity<List<Process>> allParent(@PathVariable String repoId, @PathVariable String processId) {
        return ResponseEntity.ok(processRepository.findAllParents(repoId, processId));
    }


    @RequestMapping(method = RequestMethod.GET, value = "/api/process/byName/{repoId}/{name}")
    public ResponseEntity<List<Process>> findByName(@PathVariable String repoId, @PathVariable String name) {
        return ResponseEntity.ok(processRepository.findByName(repoId, name));
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/process/byApiCall/{apiCallId}")
    public ResponseEntity<List<Process>> findByApiCall(@PathVariable String apiCallId) {
        return ResponseEntity.ok(processRepository.findByApiCall(apiCallId));
    }


    @RequestMapping(method = RequestMethod.GET, value = "/api/process/byId/{processId}")
    public ResponseEntity<Process> get(@PathVariable String processId) {
        return processRepository.findById(processId).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/process/delete/{processId}")
    public ResponseEntity<Void> delete(@PathVariable String processId) {
        processRepository.findById(processId).ifPresent(processRepository::delete);
        return ResponseEntity.ok().build();
    }

    @RequestMapping(method = RequestMethod.POST, value = "/api/process/update", produces = APPLICATION_JSON_VALUE, consumes = APPLICATION_JSON_VALUE)
    public ResponseEntity<Process> update(@RequestBody Process process) {
        Process savedProcess = processRepository.save(process);
        return ResponseEntity.ok(savedProcess);
    }


}
