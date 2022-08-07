package de.landscapr.server.authentication;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import static org.springframework.data.mongodb.core.query.Criteria.where;

@Repository
public class AccountRepository {

    private final MongoTemplate mongoTemplate;

    public AccountRepository(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public List<Account> findAll() {
        return this.mongoTemplate.findAll(Account.class);
    }

    public Optional<Account> findById(String id) {
        return Optional.ofNullable(this.mongoTemplate.findById(id, Account.class));
    }

    public Optional<Account> findByEmail(String email) {
        return Optional.ofNullable(this.mongoTemplate.findOne(Query.query(where("email").is(email)), Account.class));
    }

    public Account save(Account account) {
        return this.mongoTemplate.save(account);
    }

    public boolean delete(Account delete) {
        return this.mongoTemplate.remove(delete).wasAcknowledged();
    }
}
