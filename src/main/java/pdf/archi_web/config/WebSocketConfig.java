package pdf.archi_web.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.security.Principal;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Préfixe pour s'abonner aux topics
        config.enableSimpleBroker("/topic", "/queue/results");

        // Préfixe pour envoyer des messages
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Point d'entrée WebSocket
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                //.withSockJS()
        ; // fallback pour navigateurs anciens
    }

    public void configureClientInboundChannelll(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message); // <-- extraction ici
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    // Assigne un principal fictif
                    accessor.setUser(new Principal() {
                        @Override
                        public String getName() {
                            return "123"; //accessor.getSessionId(); // ou un autre identifiant unique
                        }
                    });
                }
                return message;
            }
        });
    }

}
