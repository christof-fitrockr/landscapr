package de.landscapr.server.system;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


@Repository()
public class SystemRepository {

    private final MongoTemplate mongoTemplate;

    public SystemRepository(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public List<System> findAll() {
        return mongoTemplate.findAll(System.class);
    }

    public Optional<System> findById(String id) {
        return Optional.ofNullable(mongoTemplate.findById(id, System.class));
    }

    public boolean delete(System system) {
        return mongoTemplate.remove(system).wasAcknowledged();
    }

    public System save(System system) {
        return mongoTemplate.save(system);
    }
}
