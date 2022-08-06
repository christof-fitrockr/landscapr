package de.landscapr.server;

public class NameValue<K, V> {

    private K name;
    private V value;

    public K getName() {
        return name;
    }

    public NameValue<K, V> setName(K name) {
        this.name = name;
        return this;
    }

    public V getValue() {
        return value;
    }

    public NameValue<K, V> setValue(V value) {
        this.value = value;
        return this;
    }
}
