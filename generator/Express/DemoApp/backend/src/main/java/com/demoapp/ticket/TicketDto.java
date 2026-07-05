package com.demoapp.ticket;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

/**
 * THRAKSHA-OWNED — regenerated on every run. Do not edit.
 *
 * Data transfer object for Ticket, with validation derived from the
 * field rules. Used for request bodies (create/update) and responses.
 */
public class TicketDto {

    private Long id;

    @NotBlank
    @Size(max = 255)
    private String title;

    @Size(max = 255)
    private String code;

    private Integer priority;

    private Boolean done;

    private Long ownerId;

    private OffsetDateTime createdAt;

    private OffsetDateTime updatedAt;

    /** Build a DTO from a persisted entity (for responses). */
    public static TicketDto fromEntity(Ticket entity) {
        TicketDto dto = new TicketDto();
        dto.setId(entity.getId());
        dto.setTitle(entity.getTitle());
        dto.setCode(entity.getCode());
        dto.setPriority(entity.getPriority());
        dto.setDone(entity.getDone());
        dto.setOwnerId(entity.getOwnerId());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }

    /** Copy the writable fields from this DTO onto an entity. */
    public void applyTo(Ticket entity) {
        entity.setTitle(this.title);
        entity.setCode(this.code);
        entity.setPriority(this.priority);
        entity.setDone(this.done);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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

    public Long getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(Long ownerId) {
        this.ownerId = ownerId;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
