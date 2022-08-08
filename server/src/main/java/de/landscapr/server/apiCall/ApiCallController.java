package de.landscapr.server.apiCall;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

@RestController
public class ApiCallController {

    private final ApiCallRepository apiCallRepository;

    public ApiCallController(ApiCallRepository apiCallRepository) {
        this.apiCallRepository = apiCallRepository;
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/apiCall/all/{repoId}")
    public ResponseEntity<List<ApiCall>> all(@PathVariable String repoId) {
        return ResponseEntity.ok(apiCallRepository.findAll(repoId));
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/apiCall/byId/{apiCallId}")
    public ResponseEntity<ApiCall> get(@PathVariable String apiCallId) {
        return apiCallRepository.findById(apiCallId).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/apiCall/delete/{apiCallId}")
    public ResponseEntity<Void> delete(@PathVariable String apiCallId) {
        apiCallRepository.findById(apiCallId).ifPresent(apiCallRepository::delete);
        return ResponseEntity.ok().build();
    }

    @RequestMapping(method = RequestMethod.POST, value = "/api/apiCall/update", produces = APPLICATION_JSON_VALUE, consumes = APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiCall> update(@RequestBody ApiCall apiCall) {
        return ResponseEntity.ok(apiCallRepository.save(apiCall));
    }
}
