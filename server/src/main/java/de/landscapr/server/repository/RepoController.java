package de.landscapr.server.repository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

@RestController
public class RepoController {

    private final RepoRepository repoRepository;

    public RepoController(RepoRepository repoRepository) {
        this.repoRepository = repoRepository;
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/repo/all")
    public ResponseEntity<List<Repo>> all() {
        return ResponseEntity.ok(repoRepository.findAll());
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/repo/byId/{repoId}")
    public ResponseEntity<Repo> get(@PathVariable String repoId) {
        return repoRepository.findById(repoId).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @RequestMapping(method = RequestMethod.GET, value = "/api/repo/delete/{repoId}")
    public ResponseEntity<Void> delete(@PathVariable String repoId) {
        repoRepository.findById(repoId).ifPresent(repoRepository::delete);
        return ResponseEntity.ok().build();
    }

    @RequestMapping(method = RequestMethod.POST, value = "/api/repo/update", produces = APPLICATION_JSON_VALUE, consumes = APPLICATION_JSON_VALUE)
    public ResponseEntity<Repo> update(@RequestBody Repo repo) {
        Repo savedRepo = repoRepository.save(repo);
        return ResponseEntity.ok(savedRepo);
    }
}
