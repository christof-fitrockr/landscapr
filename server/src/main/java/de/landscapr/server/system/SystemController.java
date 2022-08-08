package de.landscapr.server.system;

import de.landscapr.server.authentication.Role;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.*;

import javax.annotation.security.RolesAllowed;
import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

@RestController
public class SystemController {

    private final SystemRepository systemRepository;

    public SystemController(SystemRepository systemRepository) {
        this.systemRepository = systemRepository;
    }

    @Secured({Role.Code.ADMIN, Role.Code.EDITOR, Role.Code.READER })
    @RequestMapping(method = RequestMethod.GET, value = "/api/system/all")
    public ResponseEntity<List<System>> all() {
        return ResponseEntity.ok(systemRepository.findAll());
    }

    @RolesAllowed({Role.Code.ADMIN, Role.Code.EDITOR, Role.Code.READER })
    @RequestMapping(method = RequestMethod.GET, value = "/api/system/byId/{systemId}")
    public ResponseEntity<System> get(@PathVariable String systemId) {
        return systemRepository.findById(systemId).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @RolesAllowed({Role.Code.ADMIN, Role.Code.EDITOR })
    @RequestMapping(method = RequestMethod.GET, value = "/api/system/delete/{systemId}")
    public ResponseEntity<Void> delete(@PathVariable String systemId) {
        systemRepository.findById(systemId).ifPresent(systemRepository::delete);
        return ResponseEntity.ok().build();
    }

    @RolesAllowed({Role.Code.ADMIN, Role.Code.EDITOR })
    @RequestMapping(method = RequestMethod.POST, value = "/api/system/update", produces = APPLICATION_JSON_VALUE, consumes = APPLICATION_JSON_VALUE)
    public ResponseEntity<System> update(@RequestBody System system) {
        System savedSystem = systemRepository.save(system);
        return ResponseEntity.ok(savedSystem);
    }
}
