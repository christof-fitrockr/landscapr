package de.landscapr.server.process;

public class StepSuccessor {

    private String edgeTitle;
    private String processReference;

    public String getEdgeTitle() {
        return edgeTitle;
    }

    public StepSuccessor setEdgeTitle(String edgeTitle) {
        this.edgeTitle = edgeTitle;
        return this;
    }

    public String getProcessReference() {
        return processReference;
    }

    public StepSuccessor setProcessReference(String processReference) {
        this.processReference = processReference;
        return this;
    }
}
