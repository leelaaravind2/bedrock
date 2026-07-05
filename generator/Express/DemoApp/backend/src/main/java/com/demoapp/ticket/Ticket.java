package com.demoapp.ticket;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/**
 * DEVELOPER-OWNED — created once by Thraksha, then NEVER regenerated.
 *
 * Add your domain behaviour for Ticket here. The generated field
 * mapping lives in TicketBase (Thraksha-owned). This class is safe
 * to edit; regeneration will not touch it.
 */
@Entity
@Table(name = "tickets")
public class Ticket extends TicketBase {
    // Your business logic goes here.
}
