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

    @RequestMapping(method = RequestMethod.GET, value = "/api/secured/process/all")
    public ResponseEntity<List<Process>> all() {
        return ResponseEntity.ok(processRepository.findAll());
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/secured/process/byId/{processId}")
    public ResponseEntity<Process> get(@PathVariable String processId) {
        return processRepository.findById(processId).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/secured/process/delete/{processId}")
    public ResponseEntity<Void> delete(@PathVariable String processId) {
        processRepository.findById(processId).ifPresent(processRepository::delete);
        return ResponseEntity.ok().build();
    }

    @RequestMapping(method = RequestMethod.POST, value = "/api/process/system/update", produces = APPLICATION_JSON_VALUE, consumes = APPLICATION_JSON_VALUE)
    public ResponseEntity<Process> update(@RequestBody Process process) {
        Process savedProcess = processRepository.save(process);
        return ResponseEntity.ok(savedProcess);
    }
}
