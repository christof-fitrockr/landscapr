package de.landscapr.server.authentication;

public class AccountForUI {

    private String id;

    private String firstname;
    private String lastname;
    private String initials;

    public String getId() {
        return id;
    }

    public AccountForUI setId(String id) {
        this.id = id;
        return this;
    }

    public String getFirstname() {
        return firstname;
    }

    public AccountForUI setFirstname(String firstname) {
        this.firstname = firstname;
        return this;
    }

    public String getLastname() {
        return lastname;
    }

    public AccountForUI setLastname(String lastname) {
        this.lastname = lastname;
        return this;
    }

    public String getInitials() {
        return initials;
    }

    public AccountForUI setInitials(String initials) {
        this.initials = initials;
        return this;
    }

    public static AccountForUI of(Account account) {
        String initials = firstChar(account.getFirstname()) + firstChar(account.getLastname());
        return new AccountForUI().setId(account.getId()).setFirstname(account.getFirstname()).setLastname(account.getLastname()).setInitials(initials);
    }

    private static String firstChar(String str) {
        return str != null && str.length() > 0 ? String.valueOf(str.charAt(0)) : "";
    }
}
