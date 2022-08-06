package de.landscapr.server.capability;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;


@Repository()
public interface CapabilityRepository extends MongoRepository<Capability, String> {

}
