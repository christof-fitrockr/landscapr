package de.landscapr.server.apiCall;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;


@Repository()
public interface ApiCallRepository extends MongoRepository<ApiCall, String> {

}
