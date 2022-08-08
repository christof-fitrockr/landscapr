package de.landscapr.server.system;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


@Repository()
public class ApplicationRepository {

    private final MongoTemplate mongoTemplate;

    public ApplicationRepository(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public List<Application> findAll() {
        return mongoTemplate.findAll(Application.class);
    }

    public Optional<Application> findById(String id) {
        return Optional.ofNullable(mongoTemplate.findById(id, Application.class));
    }

    public boolean delete(Application application) {
        return mongoTemplate.remove(application).wasAcknowledged();
    }

    public Application save(Application application) {
        return mongoTemplate.save(application);
    }
}
