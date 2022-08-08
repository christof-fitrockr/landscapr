package de.landscapr.server.process;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

import static org.springframework.data.mongodb.core.query.Criteria.where;


@Repository()
public class ProcessRepository {

    private final MongoTemplate mongoTemplate;

    public ProcessRepository(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public List<Process> findAll(String repoId) {
        return mongoTemplate.find(Query.query(where("repoId").is(repoId)), Process.class);
    }

    public List<Process> findAllFavorites(String repoId) {
        return mongoTemplate.find(Query.query(where("repoId").is(repoId).and("favorite").is(true)), Process.class);
    }

    public Optional<Process> findById(String id) {
        return Optional.ofNullable(mongoTemplate.findById(id, Process.class));
    }

    public boolean delete(Process process) {
        return mongoTemplate.remove(process).wasAcknowledged();
    }

    public Process save(Process process) {
        return mongoTemplate.save(process);
    }

    public List<Process> byIds(List<String> processIds) {
        return mongoTemplate.find(Query.query(where("id").in(processIds)), Process.class);
    }

    public List<Process> findAllParents(String repoId, String processId) {
        return mongoTemplate.find(Query.query(where("repoId").is(repoId).and("steps.processReference").in(processId)), Process.class);
    }

    public List<Process> findByName(String repoId, String name) {
        return mongoTemplate.find(Query.query(where("repoId").is(repoId).and("name").regex(Pattern.compile(".*" + name + ".*", Pattern.CASE_INSENSITIVE))), Process.class);
    }

    public List<Process> findByApiCall(String apiCallId) {
        return mongoTemplate.find(Query.query(where("apiCallIds").in(apiCallId)), Process.class);
    }
}
