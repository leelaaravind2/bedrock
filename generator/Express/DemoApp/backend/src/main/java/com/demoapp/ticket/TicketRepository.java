package com.demoapp.ticket;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * THRAKSHA-OWNED — regenerated on every run. Do not edit.
 */
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    // Owner-scoped lookups (multi-user, ADR-005).
    List<Ticket> findAllByOwnerId(Long ownerId);

    Optional<Ticket> findByIdAndOwnerId(Long id, Long ownerId);
}
