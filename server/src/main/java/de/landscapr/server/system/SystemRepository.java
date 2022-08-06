package de.landscapr.server.system;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;


@Repository()
public interface SystemRepository extends MongoRepository<System, String> {

}
