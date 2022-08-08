package de.landscapr.server.repository;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


@Repository()
public class RepoRepository {

    private final MongoTemplate mongoTemplate;

    public RepoRepository(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public List<Repo> findAll() {
        return mongoTemplate.findAll(Repo.class);
    }

    public Optional<Repo> findById(String id) {
        return Optional.ofNullable(mongoTemplate.findById(id, Repo.class));
    }

    public boolean delete(Repo repo) {
        return mongoTemplate.remove(repo).wasAcknowledged();
    }

    public Repo save(Repo repo) {
        return mongoTemplate.save(repo);
    }
}
