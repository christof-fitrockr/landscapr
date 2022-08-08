package de.landscapr.server.application;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document
public class Application {

    @Id
    private String id;
    private String repoId;
    private String name;
    private String description;
    private String contact;
    private String url;
    private String systemCluster;
    private List<String> tags;
    private Integer status;

    public String getId() {
        return id;
    }

    public Application setId(String id) {
        this.id = id;
        return this;
    }

    public String getRepoId() {
        return repoId;
    }

    public Application setRepoId(String repoId) {
        this.repoId = repoId;
        return this;
    }

    public String getName() {
        return name;
    }

    public Application setName(String name) {
        this.name = name;
        return this;
    }

    public String getDescription() {
        return description;
    }

    public Application setDescription(String description) {
        this.description = description;
        return this;
    }

    public String getContact() {
        return contact;
    }

    public Application setContact(String contact) {
        this.contact = contact;
        return this;
    }

    public String getUrl() {
        return url;
    }

    public Application setUrl(String url) {
        this.url = url;
        return this;
    }

    public String getSystemCluster() {
        return systemCluster;
    }

    public Application setSystemCluster(String systemCluster) {
        this.systemCluster = systemCluster;
        return this;
    }

    public List<String> getTags() {
        return tags;
    }

    public Application setTags(List<String> tags) {
        this.tags = tags;
        return this;
    }

    public Integer getStatus() {
        return status;
    }

    public Application setStatus(Integer status) {
        this.status = status;
        return this;
    }
}
