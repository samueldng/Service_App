import Navbar from '../components/landing/Navbar';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import HowItWorks from '../components/landing/HowItWorks';
import PricingSection from '../components/landing/PricingSection';
import Footer from '../components/landing/Footer';

export default function LandingPage() {
    return (
        <div>
            <Navbar />
            <HeroSection />
            <FeaturesSection />
            <HowItWorks />
            <PricingSection />
            <Footer />
        </div>
    );
}
