package com.yourcompany.whatsapp.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Controller para servir o index.html do gerenciador WhatsApp
 */
@Controller
public class WebController {
    
    /**
     * Página principal - gerenciador WhatsApp
     */
    @GetMapping("/")
    public String index() {
        return "index.html";
    }
    
    /**
     * Alias para acessar em /whatsapp
     */
    @GetMapping("/whatsapp")
    public String whatsapp() {
        return "index.html";
    }
    
    /**
     * Alias para acessar em /manager
     */
    @GetMapping("/manager")
    public String manager() {
        return "index.html";
    }
    
    /**
     * Página de status
     */
    @GetMapping("/status")
    public String status() {
        return "index.html";
    }
}