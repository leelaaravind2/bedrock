package com.demoapp.ticket;

import com.demoapp.common.CurrentUserProvider;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * THRAKSHA-OWNED — regenerated on every run. Do not edit.
 *
 * Standard CRUD for Ticket, scoped to the current user (multi-user,
 * ADR-005). Your business logic belongs in TicketService, which extends
 * this class.
 */
public abstract class TicketServiceBase {

    @Autowired
    protected TicketRepository repository;

    @Autowired
    protected CurrentUserProvider currentUser;

    @Transactional(readOnly = true)
    public List<Ticket> list() {
        return repository.findAllByOwnerId(currentUser.requireCurrentUserId());
    }

    @Transactional(readOnly = true)
    public Ticket get(Long id) {
        return repository.findByIdAndOwnerId(id, currentUser.requireCurrentUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket " + id + " not found"));
    }

    @Transactional
    public Ticket create(TicketDto dto) {
        Ticket entity = new Ticket();
        dto.applyTo(entity);
        entity.setOwnerId(currentUser.requireCurrentUserId());
        return repository.save(entity);
    }

    @Transactional
    public Ticket update(Long id, TicketDto dto) {
        Ticket entity = get(id);
        dto.applyTo(entity);
        return repository.save(entity);
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(get(id));
    }
}
