package de.landscapr.server.process;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;


@Repository()
public interface ProcessRepository extends MongoRepository<Process, String> {

}
