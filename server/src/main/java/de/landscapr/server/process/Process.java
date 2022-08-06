package de.landscapr.server.process;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document
public class Process {

    @Id
    private String id;
    private String name;
    private String description;
    private Integer status;
    private String input;
    private String output;
    private List<String> tags;
    private Integer number;
    private List<Step> steps;
    private List<String> apiCallIds;
    private boolean favorite;
    private List<String> implementedBy;

    public String getId() {
        return id;
    }

    public Process setId(String id) {
        this.id = id;
        return this;
    }

    public String getName() {
        return name;
    }

    public Process setName(String name) {
        this.name = name;
        return this;
    }

    public String getDescription() {
        return description;
    }

    public Process setDescription(String description) {
        this.description = description;
        return this;
    }

    public Integer getStatus() {
        return status;
    }

    public Process setStatus(Integer status) {
        this.status = status;
        return this;
    }

    public String getInput() {
        return input;
    }

    public Process setInput(String input) {
        this.input = input;
        return this;
    }

    public String getOutput() {
        return output;
    }

    public Process setOutput(String output) {
        this.output = output;
        return this;
    }

    public List<String> getTags() {
        return tags;
    }

    public Process setTags(List<String> tags) {
        this.tags = tags;
        return this;
    }

    public Integer getNumber() {
        return number;
    }

    public Process setNumber(Integer number) {
        this.number = number;
        return this;
    }

    public List<Step> getSteps() {
        return steps;
    }

    public Process setSteps(List<Step> steps) {
        this.steps = steps;
        return this;
    }

    public List<String> getApiCallIds() {
        return apiCallIds;
    }

    public Process setApiCallIds(List<String> apiCallIds) {
        this.apiCallIds = apiCallIds;
        return this;
    }

    public boolean isFavorite() {
        return favorite;
    }

    public Process setFavorite(boolean favorite) {
        this.favorite = favorite;
        return this;
    }

    public List<String> getImplementedBy() {
        return implementedBy;
    }

    public Process setImplementedBy(List<String> implementedBy) {
        this.implementedBy = implementedBy;
        return this;
    }
}
