package de.landscapr.server.system;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document
public class System {

    @Id
    private String id;

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

    public System setId(String id) {
        this.id = id;
        return this;
    }

    public String getName() {
        return name;
    }

    public System setName(String name) {
        this.name = name;
        return this;
    }

    public String getDescription() {
        return description;
    }

    public System setDescription(String description) {
        this.description = description;
        return this;
    }

    public String getContact() {
        return contact;
    }

    public System setContact(String contact) {
        this.contact = contact;
        return this;
    }

    public String getUrl() {
        return url;
    }

    public System setUrl(String url) {
        this.url = url;
        return this;
    }

    public String getSystemCluster() {
        return systemCluster;
    }

    public System setSystemCluster(String systemCluster) {
        this.systemCluster = systemCluster;
        return this;
    }

    public List<String> getTags() {
        return tags;
    }

    public System setTags(List<String> tags) {
        this.tags = tags;
        return this;
    }

    public Integer getStatus() {
        return status;
    }

    public System setStatus(Integer status) {
        this.status = status;
        return this;
    }
}
