// pages/home.tsx
import { useState } from "react";
import Head from "next/head";
import Link from "next/link";

export default function APISalesPage() {
  const [activeTab, setActiveTab] = useState<"features" | "pricing" | "demo">(
    "features",
  );
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Sample vehicle data for demo
  const demoVehicle = {
    brand: "Volkswagen",
    model: "Golf R",
    year: "2020-2023",
    engine: "2.0 TSI 320HK 4Motion DSG",
    stages: [
      {
        name: "Steg 1",
        origHk: 320,
        origNm: 420,
        tunedHk: 400,
        tunedNm: 520,
        price: 5990,
      },
      {
        name: "Steg 2",
        origHk: 320,
        origNm: 420,
        tunedHk: 450,
        tunedNm: 570,
        price: 8990,
      },
    ],
  };

  return (
    <>
      <Head>
        <title>AK-Tuning API | Premium Vehicle Tuning Data API</title>
        <meta
          name="description"
          content="Powerful API for vehicle tuning data with multi-language, multi-currency support for automotive businesses worldwide."
        />
        <meta
          name="keywords"
          content="vehicle tuning API, car performance data, ECU tuning API, automotive API, multi-currency tuning data"
        />
        <meta
          property="og:title"
          content="AK-Tuning API - Vehicle Tuning Data Platform"
        />
        <meta
          property="og:description"
          content="Complete API solution for vehicle tuning businesses with real-time data, multi-language and multi-currency support"
        />
      </Head>

      {/* Modern, clean header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
              AK-Tuning API
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => setActiveTab("features")}
              className={`font-medium ${activeTab === "features" ? "text-red-600" : "text-gray-600 hover:text-red-600"} transition`}
            >
              Features
            </button>
            <button
              onClick={() => setActiveTab("pricing")}
              className={`font-medium ${activeTab === "pricing" ? "text-red-600" : "text-gray-600 hover:text-red-600"} transition`}
            >
              Pricing
            </button>
            <button
              onClick={() => setActiveTab("demo")}
              className={`font-medium ${activeTab === "demo" ? "text-red-600" : "text-gray-600 hover:text-red-600"} transition`}
            >
              Live Demo
            </button>
          </div>

          <Link
            href="#pricing"
            className="bg-gradient-to-r from-red-600 to-red-800 text-white px-5 py-2.5 rounded-lg font-medium hover:from-red-700 hover:to-red-900 transition shadow-sm"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section with Value Proposition */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                The Complete Tuning Data API
              </span>
              <br />
              For Automotive Businesses
            </h1>
            <p className="text-xl text-gray-600 mb-10">
              Power your automotive business with our comprehensive tuning data
              API. Real-time performance specs, multi-currency pricing, and 25+
              language support in one powerful platform.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="#pricing"
                className="bg-gradient-to-r from-red-600 to-red-800 text-white px-8 py-4 rounded-lg font-semibold hover:from-red-700 hover:to-red-900 transition shadow-lg"
              >
                View Pricing Plans
              </Link>
              <button
                onClick={() => setActiveTab("demo")}
                className="border-2 border-red-600 text-red-600 px-8 py-4 rounded-lg font-semibold hover:bg-red-50 transition"
              >
                Try Live Demo
              </button>
            </div>
          </div>
        </section>

        {/* Key Differentiators */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 flex items-center justify-center rounded-lg bg-red-50 text-red-600 text-2xl mb-6">
              💰
            </div>
            <h3 className="text-xl font-bold mb-3">Multi-Currency Pricing</h3>
            <p className="text-gray-600">
              Automatic price conversion for 20+ currencies with
              reseller-specific overrides.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 flex items-center justify-center rounded-lg bg-red-50 text-red-600 text-2xl mb-6">
              🌐
            </div>
            <h3 className="text-xl font-bold mb-3">25+ Languages</h3>
            <p className="text-gray-600">
              Full localization support with language switching for global
              customers.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 flex items-center justify-center rounded-lg bg-red-50 text-red-600 text-2xl mb-6">
              🛠️
            </div>
            <h3 className="text-xl font-bold mb-3">Complete Tuning Data</h3>
            <p className="text-gray-600">
              Detailed specs for every stage including HP, torque, pricing and
              descriptions.
            </p>
          </div>
        </section>

        {/* Data Structure Visualization */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-white rounded-xl shadow-sm mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Comprehensive Vehicle Data Hierarchy
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our API provides structured data for every level of vehicle tuning
              specifications
            </p>
          </div>

          <div className="flex justify-center">
            <div className="relative w-full max-w-4xl">
              {/* Data hierarchy visualization */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
                {["Brands", "Models", "Years", "Engines", "Stages"].map(
                  (level, index) => (
                    <div key={level} className="relative">
                      <div className="bg-gray-800 text-white p-4 rounded-lg shadow-md h-32 flex flex-col items-center justify-center">
                        <div className="text-lg font-bold mb-2">{level}</div>
                        <div className="text-sm text-gray-300">
                          {index === 0 && "50+ vehicle brands"}
                          {index === 1 && "500+ models"}
                          {index === 2 && "Year ranges"}
                          {index === 3 && "Engine variants"}
                          {index === 4 && "Tuning stages"}
                        </div>
                      </div>
                      {index < 4 && (
                        <div className="hidden md:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
                          <svg
                            className="w-8 h-8 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Sample Data Display */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Rich Tuning Data for Every Vehicle
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See the detailed tuning data our API provides for each vehicle
              configuration
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 bg-gray-800 text-white">
              <h3 className="text-xl font-bold">
                {demoVehicle.brand} {demoVehicle.model} {demoVehicle.year} -{" "}
                {demoVehicle.engine}
              </h3>
            </div>

            <div className="p-6 grid md:grid-cols-2 gap-6">
              {demoVehicle.stages.map((stage) => (
                <div
                  key={stage.name}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-lg font-bold text-red-600">
                      {stage.name}
                    </h4>
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {stage.price} SEK
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-500 uppercase font-semibold">
                        Original HP
                      </p>
                      <p className="font-bold">{stage.origHk} HK</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-500 uppercase font-semibold">
                        Tuned HP
                      </p>
                      <p className="font-bold text-red-600">
                        {stage.tunedHk} HK{" "}
                        <span className="text-green-600">
                          (+{stage.tunedHk - stage.origHk})
                        </span>
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-500 uppercase font-semibold">
                        Original Torque
                      </p>
                      <p className="font-bold">{stage.origNm} NM</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-xs text-gray-500 uppercase font-semibold">
                        Tuned Torque
                      </p>
                      <p className="font-bold text-red-600">
                        {stage.tunedNm} NM{" "}
                        <span className="text-green-600">
                          (+{stage.tunedNm - stage.origNm})
                        </span>
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    Complete stage description with technical details, benefits,
                    and requirements.
                  </p>

                  <button className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg font-medium transition">
                    View Full Details
                  </button>
                </div>
              ))}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 text-center">
              <p className="text-gray-600 mb-4">
                This is just a sample of the data available through our API.
              </p>
              <button
                onClick={() => setActiveTab("demo")}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                Explore Full Demo
              </button>
            </div>
          </div>
        </section>

        {/* Features/Demo/Pricing Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          {/* Tab Navigation */}
          <div className="flex justify-center mb-12 border-b border-gray-200">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab("features")}
                className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === "features" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                Key Features
              </button>
              <button
                onClick={() => setActiveTab("pricing")}
                className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === "pricing" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                Pricing Plans
              </button>
              <button
                onClick={() => setActiveTab("demo")}
                className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === "demo" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                Live Demo
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="mt-8">
            {activeTab === "features" && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                  >
                    <div className="w-14 h-14 flex items-center justify-center rounded-lg bg-red-50 text-red-600 text-2xl mb-6">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "pricing" && (
              <div className="grid md:grid-cols-3 gap-8">
                {pricingPlans.map((plan, index) => (
                  <div
                    key={index}
                    className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border ${
                      plan.popular
                        ? "border-2 border-red-600 relative"
                        : "border-gray-200"
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 right-6 bg-red-600 text-white px-4 py-1 rounded-full text-xs font-semibold">
                        Most Popular
                      </div>
                    )}
                    <div className="p-8">
                      <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                      <div className="text-4xl font-bold my-6">
                        {plan.price}
                        <span className="text-base font-normal text-gray-500 ml-1">
                          /{plan.period}
                        </span>
                      </div>
                      <ul className="space-y-3 mb-8">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start">
                            <svg
                              className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M5 13l4 4L19 7"
                              ></path>
                            </svg>
                            <span className="text-gray-600">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={plan.ctaLink}
                        className={`block text-center py-3 px-6 rounded-lg font-medium ${
                          plan.popular
                            ? "bg-gradient-to-r from-red-600 to-red-800 text-white hover:from-red-700 hover:to-red-900"
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        } transition shadow-sm`}
                      >
                        {plan.ctaText}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "demo" && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-8">
                  <h2 className="text-3xl font-bold mb-6">Live API Demo</h2>
                  <p className="text-gray-600 mb-6">
                    Experience our full API interface with real tuning data. The
                    demo shows exactly what your resellers will see when they
                    use your branded portal.
                  </p>

                  <div className="relative pt-[75%] rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                    {!iframeLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-pulse text-gray-500">
                          Loading API demo...
                        </div>
                      </div>
                    )}
                    <iframe
                      src="https://api.aktuning.se/reseller/demo"
                      className="absolute top-0 left-0 w-full h-full border-0"
                      onLoad={() => setIframeLoaded(true)}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      sandbox="allow-scripts allow-same-origin allow-forms"
                    />
                  </div>

                  <div className="mt-8 grid md:grid-cols-2 gap-6">
                    <div className="bg-red-50 p-6 rounded-lg border border-red-100">
                      <h3 className="font-bold text-red-800 mb-3">
                        Demo Credentials
                      </h3>
                      <div className="space-y-2">
                        <p className="text-sm">
                          <span className="font-semibold">Email:</span>{" "}
                          demo@aktuning.se
                        </p>
                        <p className="text-sm">
                          <span className="font-semibold">Password:</span>{" "}
                          demodemo
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                      <h3 className="font-bold text-blue-800 mb-3">
                        Key Features to Try
                      </h3>
                      <ul className="space-y-2 text-sm">
                        <li>• Vehicle selection hierarchy</li>
                        <li>• Multi-currency pricing</li>
                        <li>• Performance data visualization</li>
                        <li>• Stage descriptions</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="bg-gradient-to-r from-red-600 to-red-800 text-white py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-6">
              Ready to Power Your Tuning Business?
            </h2>
            <p className="text-xl text-red-100 mb-8">
              Join hundreds of automotive businesses using our API to deliver
              exceptional tuning services.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="#pricing"
                className="bg-white text-red-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition shadow-lg"
              >
                View Pricing Plans
              </Link>
              <Link
                href="#contact"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition"
              >
                Contact Our Team
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white pt-16 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-12">
          <div>
            <h3 className="text-xl font-bold mb-6">AK-Tuning API</h3>
            <p className="text-gray-400">
              The complete vehicle tuning data platform for automotive
              businesses.
            </p>
          </div>

          {footerLinks.map((column, index) => (
            <div key={index}>
              <h3 className="text-lg font-semibold mb-6">{column.title}</h3>
              <ul className="space-y-3">
                {column.links.map((link, i) => (
                  <li key={i}>
                    <Link
                      href={link.url}
                      className="text-gray-400 hover:text-white transition"
                    >
                      {link.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-lg font-semibold mb-6">Contact</h3>
            <div className="space-y-3 text-gray-400">
              <p>info@aktuning.se</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 mt-12 border-t border-gray-800 text-center">
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} AK-Tuning API. All rights
            reserved.
          </p>
        </div>
      </footer>
    </>
  );
}

// Updated data arrays
const features = [
  {
    icon: "🚗",
    title: "Complete Vehicle Hierarchy",
    description:
      "Structured data from brands down to individual engine tuning stages with all specifications.",
  },
  {
    icon: "💵",
    title: "Reseller Pricing Control",
    description:
      "Allow resellers to set custom prices while maintaining your base pricing structure.",
  },
  {
    icon: "🌍",
    title: "Global Market Ready",
    description:
      "25+ languages and 20+ currencies built-in for international businesses.",
  },
  {
    icon: "🛠️",
    title: "AKT+ Options System",
    description:
      "Manage add-on products and services that can be combined with tuning stages.",
  },
  {
    icon: "📊",
    title: "Performance Visualization",
    description:
      "Built-in dyno charts showing before/after performance for each tuning stage.",
  },
  {
    icon: "🔌",
    title: "Easy Integration",
    description:
      "We will implement it to your website for free and support you at any time, no additional costs!",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "€150",
    period: "month",
    features: [
      "10,000 API requests/month",
      "1 language included",
      "10 currencies supported",
      "Email support",
      "Basic analytics",
    ],
    ctaText: "Start Free Trial",
    ctaLink: "mailto:info@aktuning.se",
    popular: false,
  },
  {
    name: "Professional",
    price: "€199",
    period: "month",
    features: [
      "50,000 API requests/month",
      "All languages included",
      "Multiply language options",
      "All currencies supported",
      "Priority email support",
      "Advanced analytics",
      "Custom branding",
    ],
    ctaText: "Get Started",
    ctaLink: "mailto:info@aktuning.se",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "month",
    features: [
      "Unlimited resellers",
      "Unlimited API requests",
      "All features included",
      "Dedicated support",
      "White-label options",
      "Custom integrations",
      "SLAs available",
    ],
    ctaText: "Contact Sales",
    ctaLink: "mailto:info@aktuning.se",
    popular: false,
  },
];

const footerLinks = [
  {
    title: "Product",
    links: [
      { text: "Features", url: "#features" },
      { text: "Pricing", url: "#pricing" },
      { text: "Demo", url: "#demo" },
    ],
  },
];
