package de.landscapr.server.capability;

import de.landscapr.server.apiCall.ApiCall;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import static org.springframework.data.mongodb.core.query.Criteria.where;


@Repository()
public class CapabilityRepository {

    private final MongoTemplate mongoTemplate;

    public CapabilityRepository(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public List<Capability> findAll(String repoId) {
        return mongoTemplate.find(Query.query(where("repoId").is(repoId)), Capability.class);
    }

    public Optional<Capability> findById(String id) {
        return Optional.ofNullable(mongoTemplate.findById(id, Capability.class));
    }

    public List<Capability> findByImplementingSystem(String systemId) {
        return mongoTemplate.find(Query.query(where("implementedBy").in(systemId)), Capability.class);
    }

    public boolean delete(Capability capability) {
        return mongoTemplate.remove(capability).wasAcknowledged();
    }

    public Capability save(Capability capability) {
        return mongoTemplate.save(capability);
    }

    public boolean deleteByRepoId(String repoId) {
        return mongoTemplate.remove(Query.query(where("repoId").is(repoId)), Capability.class).wasAcknowledged();
    }
}
