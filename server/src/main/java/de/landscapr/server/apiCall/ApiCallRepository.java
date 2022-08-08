package de.landscapr.server.apiCall;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


@Repository()
public class ApiCallRepository {

    private final MongoTemplate mongoTemplate;

    public ApiCallRepository(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public List<ApiCall> findAll() {
        return mongoTemplate.findAll(ApiCall.class);
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
    
}
