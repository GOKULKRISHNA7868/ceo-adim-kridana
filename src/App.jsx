import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { AuthProvider } from "./context/AuthContext";
import ScrollToTop from "./components/ScrollToTop";

/* ================= CORE PAGES ================= */

import Login from "./pages/Login.jsx";
import Landing from "./pages/Landing.jsx";

/* ================= NAVBAR ================= */
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer";
import Adminkyc from "./pages/Adminkyc.jsx";
import "./index.css";
import Transications from "./pages/Transications.jsx";
function App() {
  const location = useLocation();

  const hideNavbarPaths = [
    "/RoleSelection",
    "/login",
    "/signup",
    "/trainer-signup",
    "/institute-signup",
  ];
  const hideFooterPaths = [
    "/RoleSelection", // Welcome to Kridana page
  ];

  const showNavbar = !hideNavbarPaths.includes(location.pathname);
  const showFooter = !hideFooterPaths.includes(location.pathname);

  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <div className="bg-white text-black min-h-screen">
            {showNavbar && <Navbar />}
            <ScrollToTop />

            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/Landing" element={<Landing />} />
              <Route path="/adminkyc" element={<Adminkyc />} />
              <Route path="/Transications" element={<Transications />} />
              {/* AUTH 
              <Route path="/about" element={<About />} />
              <Route path="/career" element={<Career />} />
              <Route path="/contact" element={<Contact />} />

              <Route path="/signup" element={<Signup />} />
              <Route path="/trainer-signup" element={<TrainerSignup />} />
              <Route path="/institute-signup" element={<InstituteSignup />} />*/}

              {/* LANDING
              <Route path="/RoleSelection" element={<RoleSelection />} />
              <Route path="/reels" element={<ReelViewer />} /> */}
              {/* DASHBOARDS 
              <Route
                path="/trainers/dashboard"
                element={
                  <ProtectedRoute role="trainer">
                    <TrainersDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/institutes/dashboard"
                element={
                  <ProtectedRoute role="institute">
                    <InstituteDashboard />
                  </ProtectedRoute>
                }
              />

              <Route path="/user/dashboard" element={<UserDashboard />} />*/}

              {/* SELL
              <Route
                path="/sell-sports-material"
                element={<SellSportsMaterial />}
              />
              <Route
                path="/upload-product-details"
                element={<UploadProductDetails />}
              /> */}

              {/* SHOP 
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/shop/:category" element={<ProductsGridPage />} />
              <Route path="/addresspage" element={<AddAddressPage />} />
              <Route path="/payment" element={<PaymentPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />*/}

              {/* LIST & DETAILS 
              <Route path="/trainers" element={<ViewTrainers />} />
              <Route path="/institutes" element={<ViewInstitutes />} />
              <Route path="/trainers/:id" element={<TrainerDetailsPage />} />
              <Route
                path="/institutes/:id"
                element={<InstituteDetailsPage />}
              />
              <Route path="/viewTrainers" element={<ViewTrainers />} />
              <Route path="/viewInstitutes" element={<ViewInstitutes />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/paymentpolicy" element={<PaymentPolicy />} />
              <Route
                path="/customer-policies"
                element={<CustomerCentricPolicies />}
              />
              <Route
                path="/delivery-shipping-policy"
                element={<DeliveryAndShippingPolicy />}
              />
              <Route
                path="/payment-refund-policy"
                element={<PaymentAndRefundPolicy />}
              />*/}

              {/* SERVICES 
              <Route path="/categories" element={<Categories />} />
              <Route path="/services/martial-arts" element={<MartialArts />} />
              <Route path="/services/teamball" element={<TeamBallSports />} />
              <Route path="/services/racketsports" element={<RacketSports />} />
              <Route path="/services/fitness" element={<Fitness />} />
              <Route
                path="/services/target-precision-sports"
                element={<TargetPrecisionSports />}
              />
              <Route
                path="/services/equestrian-sports"
                element={<EquestrianSports />}
              />
              <Route
                path="/services/adventure-outdoor-sports"
                element={<AdventureOutdoorSports />}
              />
              <Route path="/services/ice-sports" element={<IceSports />} />
              <Route path="/services/wellness" element={<Wellness />} />
              <Route path="/services/dance" element={<Dance />} />

              <Route path="/plans" element={<Plans />} />
              <Route
                path="/book-demo/:instituteId"
                element={<AvailableDemoClasses />}
              />*/}
            </Routes>
            {showFooter && <Footer />}
          </div>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
