document.addEventListener('DOMContentLoaded', function() {
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.querySelector('.prev');
    const nextBtn = document.querySelector('.next');
    let currentSlide = 0;
    let slideInterval;
    const slideDuration = 10000; // 10 seconds
    
    // Initialize slider
    function initSlider() {
        if (slides.length > 0) {
            slides[0].classList.add('active');
            startSlideTimer();
        }
    }
    
    // Go to specific slide
    function goToSlide(n) {
        slides[currentSlide].classList.remove('active');
        currentSlide = (n + slides.length) % slides.length;
        slides[currentSlide].classList.add('active');
    }
    
    // Next slide
    function nextSlide() {
        goToSlide(currentSlide + 1);
    }
    
    // Previous slide
    function prevSlide() {
        goToSlide(currentSlide - 1);
    }
    
    // Start slide timer
    function startSlideTimer() {
        slideInterval = setInterval(() => {
            nextSlide();
        }, slideDuration);
    }
    
    // Reset slide timer
    function resetSlideTimer() {
        clearInterval(slideInterval);
        startSlideTimer();
    }
    
    // Event listeners
    nextBtn.addEventListener('click', () => {
        nextSlide();
        resetSlideTimer();
    });
    
    prevBtn.addEventListener('click', () => {
        prevSlide();
        resetSlideTimer();
    });
    
    // Initialize
    initSlider();
    
    // Pause on hover (optional)
    const slider = document.querySelector('.slider-container');
    slider.addEventListener('mouseenter', () => clearInterval(slideInterval));
    slider.addEventListener('mouseleave', startSlideTimer);
});

// Add this near the top of your index-script.js
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Load featured products
        const productsResponse = await fetch('/api/products/featured');
        if (!productsResponse.ok) throw new Error('Failed to load featured products');
        const featuredProducts = await productsResponse.json();
        renderFeaturedProducts(featuredProducts);

        // Load categories
        const categoriesResponse = await fetch('/api/categories');
        if (!categoriesResponse.ok) throw new Error('Failed to load categories');
        const categories = await categoriesResponse.json();
        renderCategories(categories);
    } catch (error) {
        console.error('Error loading data:', error);
        document.querySelector('.products-container').innerHTML = 
            '<p class="error-message">Impossible de charger le contenu. Veuillez réessayer plus tard.</p>';
        document.getElementById('categories-container').innerHTML = 
            '<p class="error-message">Impossible de charger les catégories.</p>';
    }
});

// Add this new function to render categories
function renderCategories(categories) {
    const container = document.getElementById('categories-container');
    
    if (!categories || categories.length === 0) {
        container.innerHTML = '<p class="no-categories">Aucune catégorie disponible pour le moment.</p>';
        return;
    }
    
    container.innerHTML = categories.map(category => `
        <div class="category-card">
            <div class="category-image">
                <img src="/images/categories/${category.image}" alt="${category.name}" onerror="this.onerror=null;this.src='images/default-category.jpg';">
            </div>
            <h3 class="category-name"><a href="shop.html?category=${encodeURIComponent(category.name)}">${category.name}</a></h3>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', async function() {
    try {
        const response = await fetch('/api/products/featured');
        if (!response.ok) throw new Error('Failed to load featured products');
        
        const featuredProducts = await response.json();
        renderFeaturedProducts(featuredProducts);
    } catch (error) {
        console.error('Error loading featured products:', error);
        document.querySelector('.products-container').innerHTML = 
            '<p class="error-message">Impossible de charger les produits vedettes. Veuillez réessayer plus tard.</p>';
    }
});

function getPriceDisplay(variants) {
    if (!variants || variants.length === 0) return '0.00 DA';
    
    const prices = variants.map(v => v.price).filter(p => p !== undefined);
    if (prices.length === 0) return '0.00 DA';
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    if (minPrice === maxPrice) {
        return `${minPrice.toLocaleString('en-US')} DA`;
    } else {
        return `${minPrice.toLocaleString('en-US')}-${maxPrice.toLocaleString('en-US')} DA`;
    }
}

function renderFeaturedProducts(products) {
    const container = document.querySelector('.products-container');
    const isLoggedIn = checkLoggedInStatus(); // Check login status
    
    if (!products || products.length === 0) {
        container.innerHTML = '<p class="no-products">Aucun produit vedette disponible pour le moment.</p>';
        return;
    }
    
    const displayedProducts = products.slice(0, 5);
    
    container.innerHTML = displayedProducts.map((product, index) => {
        const imageSrc = Array.isArray(product.images) && product.images.length > 0 
            ? `/images/products/${product.images[0]}` 
            : product.image 
                ? `/images/products/${product.image}` 
                : '';
        
        const badge = index === 0 ? '<div class="product-badge">Meilleure vente</div>' : 
                     index === 2 ? '<div class="product-badge">Nouveau</div>' : 
                     index === 4 ? '<div class="product-badge">Populaire</div>' : '';
        
        const ratings = [
            { stars: 4.5, count: 24 },
            { stars: 4, count: 18 },
            { stars: 5, count: 32 },
            { stars: 4.5, count: 45 },
            { stars: 4, count: 28 }
        ];
        
        const formatPrice = (price) => {
            if (!price) return '0 DA';
            const num = Number(price);
            return num % 1 === 0 ? num.toFixed(0) + ' DA' : num.toFixed(2) + ' DA';
        };

        const formattedPrice = isLoggedIn ? getPriceDisplay(product.variants) : '~ ~ ~';
        
        return `
        <div class="product-card">
            ${badge}
            <div class="product-image">
                ${imageSrc ? `<img src="${imageSrc}" alt="${product.name}">` : '<div class="no-image">Pas d\'image</div>'}
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                ${product.category ? `<div class="product-category">${product.category}</div>` : ''}
                <div class="product-rating">
                    ${renderStars(ratings[index].stars)}
                    <span>(${ratings[index].count})</span>
                </div>
                <div class="product-price ${!isLoggedIn ? 'price-hidden' : ''}">${formattedPrice}</div>
                <a href="product.html?name=${encodeURIComponent(product.name)}" class="add-to-cart">Ajouter au panier</a>
            </div>
        </div>
        `;
    }).join('');
}

// Add this helper function to check login status
function checkLoggedInStatus() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        return decoded.exp * 1000 > Date.now();
    } catch (e) {
        return false;
    }
}

// Helper function to render star ratings
function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    
    // Half star
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}