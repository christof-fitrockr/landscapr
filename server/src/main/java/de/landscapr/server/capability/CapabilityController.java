package de.landscapr.server.capability;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

@RestController
public class CapabilityController {

    private final CapabilityRepository capabilityRepository;

    public CapabilityController(CapabilityRepository capabilityRepository) {
        this.capabilityRepository = capabilityRepository;
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/capability/all/{repoId}")
    public ResponseEntity<List<Capability>> all(@PathVariable String repoId) {
        return ResponseEntity.ok(capabilityRepository.findAll(repoId));
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/capability/byId/{capabilityId}")
    public ResponseEntity<Capability> findById(@PathVariable String capabilityId) {
        return capabilityRepository.findById(capabilityId).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/capability/byImplementation/{systemId}")
    public ResponseEntity<List<Capability>> findByImplementingSystem(@PathVariable String systemId) {
        return ResponseEntity.ok(capabilityRepository.findByImplementingSystem(systemId));
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/capability/delete/{capabilityId}")
    public ResponseEntity<Void> delete(@PathVariable String capabilityId) {
        capabilityRepository.findById(capabilityId).ifPresent(capabilityRepository::delete);
        return ResponseEntity.ok().build();
    }

    @RequestMapping(method = RequestMethod.POST, value = "/api/capability/update", produces = APPLICATION_JSON_VALUE, consumes = APPLICATION_JSON_VALUE)
    public ResponseEntity<Capability> update(@RequestBody Capability capability) {
        return ResponseEntity.ok(capabilityRepository.save(capability));
    }
}
