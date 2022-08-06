package de.landscapr.server.process;

import java.util.List;

public class Step {

    private String processReference;
    private List<StepSuccessor> successors;

    public String getProcessReference() {
        return processReference;
    }

    public Step setProcessReference(String processReference) {
        this.processReference = processReference;
        return this;
    }

    public List<StepSuccessor> getSuccessors() {
        return successors;
    }

    public Step setSuccessors(List<StepSuccessor> successors) {
        this.successors = successors;
        return this;
    }
}
