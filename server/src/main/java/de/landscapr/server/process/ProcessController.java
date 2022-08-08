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

    @RequestMapping(method = RequestMethod.GET, value = "/api/process/all")
    public ResponseEntity<List<Process>> all() {
        return ResponseEntity.ok(processRepository.findAll());
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/process/allFavorites")
    public ResponseEntity<List<Process>> allFavorites() {
        return ResponseEntity.ok(processRepository.findAllFavorites());
    }

//    @RequestMapping(method = RequestMethod.POST, value = "/api/process/byIds/{processId}")
//    public ResponseEntity<List<Process>> byIds(@RequestBody List<String> processIds) {
//        return ResponseEntity.ok(processRepository.byIds(processIds));
//    }
//
//    @RequestMapping(method = RequestMethod.GET, value = "/api/process/allParent/{processId}")
//    public ResponseEntity<List<Process>> allParent(@PathVariable String processId) {
//        return ResponseEntity.ok(processRepository.findAllParents(processId)));
//    }
//
//
//    byIds(ids: string[]): Observable<Process[]> {
//        return this.http.post<Process[]>(`${environment.apiUrl}/process/byIds`, ids);
//    }
//
//    byName(name: string): Observable<Process[]> {
//        return this.http.get<Process[]>(`${environment.apiUrl}/process/byName/` + name);
//    }
//
//    byApiCall(apiCallId: string) {
//        return this.http.get<Process[]>(`${environment.apiUrl}/process/byApiCall/` + apiCallId);
//    }


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
