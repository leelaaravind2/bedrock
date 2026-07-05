package com.demoapp.ticket;

import com.demoapp.common.BaseOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;

/**
 * THRAKSHA-OWNED — regenerated on every run. Do not edit.
 *
 * Generated field mapping for the Ticket entity. Extends
 * BaseOwnedEntity so per-user ownership and audit timestamps are present
 * from the start (multi-user-ready, ADR-005). Your business logic belongs
 * in Ticket.java, which extends this class.
 */
@MappedSuperclass
public abstract class TicketBase extends BaseOwnedEntity {

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "code", unique = true, length = 255)
    private String code;

    @Column(name = "priority")
    private Integer priority;

    @Column(name = "done")
    private Boolean done;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public Integer getPriority() {
        return priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public Boolean getDone() {
        return done;
    }

    public void setDone(Boolean done) {
        this.done = done;
    }
}
