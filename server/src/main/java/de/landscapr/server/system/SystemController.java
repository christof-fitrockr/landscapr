package de.landscapr.server.system;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

@RestController
public class SystemController {

    private final SystemRepository systemRepository;

    public SystemController(SystemRepository systemRepository) {
        this.systemRepository = systemRepository;
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/secured/system/all")
    public ResponseEntity<List<System>> all() {
        return ResponseEntity.ok(systemRepository.findAll());
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/secured/system/byId/{systemId}")
    public ResponseEntity<System> get(@PathVariable String systemId) {
        return systemRepository.findById(systemId).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/secured/system/delete/{systemId}")
    public ResponseEntity<Void> delete(@PathVariable String systemId) {
        systemRepository.findById(systemId).ifPresent(systemRepository::delete);
        return ResponseEntity.ok().build();
    }

    @RequestMapping(method = RequestMethod.POST, value = "/api/secured/system/update", produces = APPLICATION_JSON_VALUE, consumes = APPLICATION_JSON_VALUE)
    public ResponseEntity<System> update(@RequestBody System system) {
        System savedSystem = systemRepository.save(system);
        return ResponseEntity.ok(savedSystem);
    }
}
