package de.landscapr.server;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.*;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableWebMvc
public class WebModuleConfiguration implements WebMvcConfigurer {


    @Override
    public void addResourceHandlers(ResourceHandlerRegistry aRegistry) {
        aRegistry.addResourceHandler("/**/*")
                .addResourceLocations("classpath:/static/")
                .setCacheControl(CacheControl.maxAge(1, TimeUnit.DAYS))
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        Resource requestedResource = location.createRelative(resourcePath);
                        return requestedResource.exists() && requestedResource.isReadable() ? requestedResource : new ClassPathResource("/static/index.html");
                    }
                });

    }

    @Override
    public void addViewControllers(ViewControllerRegistry aRegistry) {
        aRegistry.addRedirectViewController("/", "/index.html");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**").allowedOrigins("*").allowedMethods("GET", "POST", "PUT", "DELETE");;
    }
}
