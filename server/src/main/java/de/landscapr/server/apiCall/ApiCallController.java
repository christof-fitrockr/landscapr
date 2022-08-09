package de.landscapr.server.apiCall;

import de.landscapr.server.application.Application;
import de.landscapr.server.authentication.Role;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.annotation.security.RolesAllowed;
import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

@RestController
public class ApiCallController {

    private final ApiCallRepository apiCallRepository;

    public ApiCallController(ApiCallRepository apiCallRepository) {
        this.apiCallRepository = apiCallRepository;
    }

    @RolesAllowed({Role.Code.ADMIN, Role.Code.EDITOR, Role.Code.READER })
    @RequestMapping(method = RequestMethod.GET, value = "/api/apiCall/all/{repoId}")
    public ResponseEntity<List<ApiCall>> all(@PathVariable String repoId) {
        return ResponseEntity.ok(apiCallRepository.findAll(repoId));
    }

    @RolesAllowed({Role.Code.ADMIN, Role.Code.EDITOR, Role.Code.READER })
    @RequestMapping(method = RequestMethod.GET, value = "/api/apiCall/byId/{apiCallId}")
    public ResponseEntity<ApiCall> get(@PathVariable String apiCallId) {
        return apiCallRepository.findById(apiCallId).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @RolesAllowed({Role.Code.ADMIN, Role.Code.EDITOR, Role.Code.READER })
    @RequestMapping(method = RequestMethod.POST, value = "/api/apiCall/byName/{repoId}")
    public ResponseEntity<List<ApiCall>> findByName(@PathVariable String repoId, @RequestBody String name) {
        return ResponseEntity.ok(apiCallRepository.findByName(repoId, name));
    }

    @RolesAllowed({Role.Code.ADMIN, Role.Code.EDITOR })
    @RequestMapping(method = RequestMethod.GET, value = "/api/apiCall/delete/{apiCallId}")
    public ResponseEntity<Void> delete(@PathVariable String apiCallId) {
        apiCallRepository.findById(apiCallId).ifPresent(apiCallRepository::delete);
        return ResponseEntity.ok().build();
    }

    @RolesAllowed({Role.Code.ADMIN, Role.Code.EDITOR })
    @RequestMapping(method = RequestMethod.POST, value = "/api/apiCall/update", produces = APPLICATION_JSON_VALUE, consumes = APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiCall> update(@RequestBody ApiCall apiCall) {
        return ResponseEntity.ok(apiCallRepository.save(apiCall));
    }
}
