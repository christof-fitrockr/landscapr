package de.landscapr.server.repository;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document
public class Repo {

    @Id
    private String id;
    private String name;
    private String description;
    private Integer status;

    public String getId() {
        return id;
    }

    public Repo setId(String id) {
        this.id = id;
        return this;
    }

    public String getName() {
        return name;
    }

    public Repo setName(String name) {
        this.name = name;
        return this;
    }

    public String getDescription() {
        return description;
    }

    public Repo setDescription(String description) {
        this.description = description;
        return this;
    }

    public Integer getStatus() {
        return status;
    }

    public Repo setStatus(Integer status) {
        this.status = status;
        return this;
    }
}
