package de.landscapr.server.application;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

import static org.springframework.data.mongodb.core.query.Criteria.where;


@Repository()
public class ApplicationRepository {

    private final MongoTemplate mongoTemplate;

    public ApplicationRepository(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public List<Application> findAll(String repoId) {
        return mongoTemplate.find(Query.query(where("repoId").is(repoId)), Application.class);
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


    public List<Application> findByName(String repoId, String name) {
        return mongoTemplate.find(Query.query(where("repoId").is(repoId)
                .and("name").regex(Pattern.compile(".*" + name + ".*", Pattern.CASE_INSENSITIVE))), Application.class);
    }
}
