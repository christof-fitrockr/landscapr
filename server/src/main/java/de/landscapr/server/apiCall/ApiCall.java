package de.landscapr.server.apiCall;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document
public class ApiCall {

    @Id
    private String id;
    private String name;
    private String description;
    private String implementationStatus;
    private String docLinkUrl;
    private String capabilityId;
    private List<String> implementedBy;
    private String input;
    private String output;
    private String apiCallId;
    private List<String> tags;
    private Integer implementationType;
    private Integer status;


    public String getId() {
        return id;
    }

    public ApiCall setId(String id) {
        this.id = id;
        return this;
    }

    public String getName() {
        return name;
    }

    public ApiCall setName(String name) {
        this.name = name;
        return this;
    }

    public String getDescription() {
        return description;
    }

    public ApiCall setDescription(String description) {
        this.description = description;
        return this;
    }

    public String getImplementationStatus() {
        return implementationStatus;
    }

    public ApiCall setImplementationStatus(String implementationStatus) {
        this.implementationStatus = implementationStatus;
        return this;
    }

    public String getDocLinkUrl() {
        return docLinkUrl;
    }

    public ApiCall setDocLinkUrl(String docLinkUrl) {
        this.docLinkUrl = docLinkUrl;
        return this;
    }

    public String getCapabilityId() {
        return capabilityId;
    }

    public ApiCall setCapabilityId(String capabilityId) {
        this.capabilityId = capabilityId;
        return this;
    }

    public List<String> getImplementedBy() {
        return implementedBy;
    }

    public ApiCall setImplementedBy(List<String> implementedBy) {
        this.implementedBy = implementedBy;
        return this;
    }

    public String getInput() {
        return input;
    }

    public ApiCall setInput(String input) {
        this.input = input;
        return this;
    }

    public String getOutput() {
        return output;
    }

    public ApiCall setOutput(String output) {
        this.output = output;
        return this;
    }

    public String getApiCallId() {
        return apiCallId;
    }

    public ApiCall setApiCallId(String apiCallId) {
        this.apiCallId = apiCallId;
        return this;
    }

    public List<String> getTags() {
        return tags;
    }

    public ApiCall setTags(List<String> tags) {
        this.tags = tags;
        return this;
    }

    public Integer getImplementationType() {
        return implementationType;
    }

    public ApiCall setImplementationType(Integer implementationType) {
        this.implementationType = implementationType;
        return this;
    }

    public Integer getStatus() {
        return status;
    }

    public ApiCall setStatus(Integer status) {
        this.status = status;
        return this;
    }
}
