package de.landscapr.server.repository;

import de.landscapr.server.apiCall.ApiCall;
import de.landscapr.server.apiCall.ApiCallRepository;
import de.landscapr.server.application.Application;
import de.landscapr.server.application.ApplicationRepository;
import de.landscapr.server.authentication.Role;
import de.landscapr.server.capability.Capability;
import de.landscapr.server.capability.CapabilityRepository;
import de.landscapr.server.process.Process;
import de.landscapr.server.process.ProcessRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.annotation.security.RolesAllowed;
import java.util.List;
import java.util.Optional;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

@RestController
public class RepoController {

    private final RepoRepository repoRepository;
    private final RepoService repoService;

    public RepoController(RepoRepository repoRepository, RepoService repoService) {
        this.repoRepository = repoRepository;
        this.repoService = repoService;
    }

    @RolesAllowed({Role.Code.ADMIN, Role.Code.EDITOR, Role.Code.READER })
    @RequestMapping(method = RequestMethod.GET, value = "/api/repo/all")
    public ResponseEntity<List<Repo>> all() {
        return ResponseEntity.ok(repoRepository.findAll());
    }

    @RolesAllowed({Role.Code.ADMIN, Role.Code.EDITOR, Role.Code.READER })
    @RequestMapping(method = RequestMethod.GET, value = "/api/repo/byId/{repoId}")
    public ResponseEntity<Repo> get(@PathVariable String repoId) {
        return repoRepository.findById(repoId).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @RolesAllowed({Role.Code.ADMIN})
    @RequestMapping(method = RequestMethod.GET, value = "/api/repo/delete/{repoId}")
    public ResponseEntity<Void> delete(@PathVariable String repoId) {
        repoService.delete(repoId);
        return ResponseEntity.ok().build();
    }

    @RolesAllowed({Role.Code.ADMIN})
    @RequestMapping(method = RequestMethod.POST, value = "/api/repo/copy/{repoId}")
    public ResponseEntity<Void> copy(@PathVariable String repoId, @RequestBody String name) {
        repoService.copy(repoId, name);
        return ResponseEntity.ok().build();
    }


    @RolesAllowed({Role.Code.ADMIN})
    @RequestMapping(method = RequestMethod.POST, value = "/api/repo/update", produces = APPLICATION_JSON_VALUE, consumes = APPLICATION_JSON_VALUE)
    public ResponseEntity<Repo> update(@RequestBody Repo repo) {
        Repo savedRepo = repoRepository.save(repo);
        return ResponseEntity.ok(savedRepo);
    }
}
