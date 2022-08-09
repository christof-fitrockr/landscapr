package de.landscapr.server.apiCall;

import de.landscapr.server.application.Application;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

import static org.springframework.data.mongodb.core.query.Criteria.where;


@Repository()
public class ApiCallRepository {

    private final MongoTemplate mongoTemplate;

    public ApiCallRepository(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public List<ApiCall> findAll(String repoId) {
        return mongoTemplate.find(Query.query(where("repoId").is(repoId)), ApiCall.class);
    }

    public Optional<ApiCall> findById(String id) {
        return Optional.ofNullable(mongoTemplate.findById(id, ApiCall.class));
    }

    public boolean delete(ApiCall apiCall) {
        return mongoTemplate.remove(apiCall).wasAcknowledged();
    }

    public ApiCall save(ApiCall apiCall) {
        return mongoTemplate.save(apiCall);
    }


    public List<ApiCall> findByName(String repoId, String name) {
        return mongoTemplate.find(Query.query(where("repoId").is(repoId)
                .and("name").regex(Pattern.compile(".*" + name + ".*", Pattern.CASE_INSENSITIVE))), ApiCall.class);
    }
}
