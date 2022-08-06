package de.landscapr.server.capability;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document
public class Capability {

    @Id
    private String id;
    private String name;
    private String description;
    private List<String> implementedBy;
    private Integer status;
    private List<String> tags;

    public String getId() {
        return id;
    }

    public Capability setId(String id) {
        this.id = id;
        return this;
    }

    public String getName() {
        return name;
    }

    public Capability setName(String name) {
        this.name = name;
        return this;
    }

    public String getDescription() {
        return description;
    }

    public Capability setDescription(String description) {
        this.description = description;
        return this;
    }

    public List<String> getImplementedBy() {
        return implementedBy;
    }

    public Capability setImplementedBy(List<String> implementedBy) {
        this.implementedBy = implementedBy;
        return this;
    }

    public Integer getStatus() {
        return status;
    }

    public Capability setStatus(Integer status) {
        this.status = status;
        return this;
    }

    public List<String> getTags() {
        return tags;
    }

    public Capability setTags(List<String> tags) {
        this.tags = tags;
        return this;
    }
}
