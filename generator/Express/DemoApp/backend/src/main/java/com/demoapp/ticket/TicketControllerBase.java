package com.demoapp.ticket;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * THRAKSHA-OWNED — regenerated on every run. Do not edit.
 *
 * Standard CRUD endpoints for Ticket. The concrete @RestController
 * (TicketController) extends this and carries the @RequestMapping; add your
 * own endpoints there.
 */
public abstract class TicketControllerBase {

    @Autowired
    protected TicketService service;

    @GetMapping
    public List<TicketDto> list() {
        return service.list().stream().map(TicketDto::fromEntity).toList();
    }

    @GetMapping("/{id}")
    public TicketDto get(@PathVariable Long id) {
        return TicketDto.fromEntity(service.get(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TicketDto create(@Valid @RequestBody TicketDto dto) {
        return TicketDto.fromEntity(service.create(dto));
    }

    @PutMapping("/{id}")
    public TicketDto update(@PathVariable Long id, @Valid @RequestBody TicketDto dto) {
        return TicketDto.fromEntity(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
