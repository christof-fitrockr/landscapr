package de.landscapr.server;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(basePackages = {"de.landscapr.server"}, mongoTemplateRef = "mongoTemplate")
public class PrimaryMongoConfig {
}
