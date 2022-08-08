package de.landscapr.server.application;

import de.landscapr.server.authentication.Role;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.*;

import javax.annotation.security.RolesAllowed;
import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

@RestController
public class ApplicationController {

    private final ApplicationRepository applicationRepository;

    public ApplicationController(ApplicationRepository applicationRepository) {
        this.applicationRepository = applicationRepository;
    }

    @Secured({Role.Code.ADMIN, Role.Code.EDITOR, Role.Code.READER })
    @RequestMapping(method = RequestMethod.GET, value = "/api/application/all/{repoId}")
    public ResponseEntity<List<Application>> all(@PathVariable String repoId) {
        return ResponseEntity.ok(applicationRepository.findAll(repoId));
    }

    @RolesAllowed({Role.Code.ADMIN, Role.Code.EDITOR, Role.Code.READER })
    @RequestMapping(method = RequestMethod.GET, value = "/api/application/byId/{systemId}")
    public ResponseEntity<Application> get(@PathVariable String systemId) {
        return applicationRepository.findById(systemId).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @RolesAllowed({Role.Code.ADMIN, Role.Code.EDITOR })
    @RequestMapping(method = RequestMethod.GET, value = "/api/application/delete/{systemId}")
    public ResponseEntity<Void> delete(@PathVariable String systemId) {
        applicationRepository.findById(systemId).ifPresent(applicationRepository::delete);
        return ResponseEntity.ok().build();
    }

    @RolesAllowed({Role.Code.ADMIN, Role.Code.EDITOR })
    @RequestMapping(method = RequestMethod.POST, value = "/api/application/update", produces = APPLICATION_JSON_VALUE, consumes = APPLICATION_JSON_VALUE)
    public ResponseEntity<Application> update(@RequestBody Application application) {
        Application savedApplication = applicationRepository.save(application);
        return ResponseEntity.ok(savedApplication);
    }
}
