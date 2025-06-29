"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle,
  Clock,
  Globe,
  Menu,
  MessageSquare,
  Play,
  Target,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-primary">IELTS Nook</h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <a
                  href="#features"
                  className="text-muted-foreground hover:text-primary px-3 py-2 text-sm font-medium transition-colors"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  className="text-muted-foreground hover:text-primary px-3 py-2 text-sm font-medium transition-colors"
                >
                  How It Works
                </a>
                <a
                  href="#pricing"
                  className="text-muted-foreground hover:text-primary px-3 py-2 text-sm font-medium transition-colors"
                >
                  Pricing
                </a>
                {/* <a
                  href="#testimonials"
                  className="text-muted-foreground hover:text-primary px-3 py-2 text-sm font-medium transition-colors"
                >
                  Testimonials
                </a> */}
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <Link href="/sign-in">
                <Button>Get Started</Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t">
                <a
                  href="#features"
                  className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary"
                >
                  How It Works
                </a>
                <a
                  href="#pricing"
                  className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary"
                >
                  Pricing
                </a>
                {/* <a
                  href="#testimonials"
                  className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary"
                >
                  Testimonials
                </a> */}
                <div className="pt-4 pb-3 border-t">
                  <div className="flex flex-col space-y-2">
                    <Link href="http://localhost:5173/">
                      <Button className="w-full">Get Started</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-12 md:py-24 lg:py-32 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-6">
              <Badge variant="secondary" className="w-fit">
                🚀 Transform Your IELTS Teaching Center
              </Badge>
              <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold tracking-tight">
                The Perfect <span className="text-primary">IELTS Solution</span>{" "}
                for Small & Medium Centers
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
                IELTS Nook helps small and medium teaching centers deliver
                world-class IELTS preparation with less effort and better
                results.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="http://localhost:5173">
                  <Button size="lg" className="w-full sm:w-auto">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Watch Demo
                </Button>
              </div>
              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Free 14-day trial
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  No credit card required
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <BookOpen className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground">
                    Interactive Dashboard Preview
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-12">
            <Badge variant="secondary">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Designed for Small & Medium Centers
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              IELTS Nook provides all the tools you need to compete with larger
              institutions, without the enterprise price tag.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                title: "Student Management",
                description:
                  "Easily manage student profiles, track enrollment, and monitor individual progress across all IELTS skills.",
              },
              {
                icon: BookOpen,
                title: "Exercise Builder",
                description:
                  "Create custom IELTS exercises for Reading, Writing, Listening, and Speaking with our intuitive builder.",
              },
              {
                icon: BarChart3,
                title: "Analytics & Reports",
                description:
                  "Get detailed insights into student performance, class effectiveness, and center-wide statistics.",
              },
              {
                icon: Clock,
                title: "Class Scheduling",
                description:
                  "Manage class schedules, track attendance, and send automated reminders to students.",
              },
              {
                icon: Target,
                title: "Progress Tracking",
                description:
                  "Monitor student progress with detailed skill breakdowns and personalized learning paths.",
              },
              {
                icon: Award,
                title: "Certification System",
                description:
                  "Generate certificates and track student achievements throughout their IELTS journey.",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="border-0 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-12 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-12">
            <Badge variant="secondary">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Get Started in Minutes
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Setting up your IELTS teaching center has never been easier.
              Follow these simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Sign Up & Setup",
                description:
                  "Create your account and set up your teaching center profile in under 5 minutes.",
              },
              {
                step: "02",
                title: "Add Students & Classes",
                description:
                  "Import your existing student data or add new students and create class schedules.",
              },
              {
                step: "03",
                title: "Start Teaching",
                description:
                  "Begin using our comprehensive tools to deliver exceptional IELTS education.",
              },
            ].map((step, index) => (
              <div key={index} className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {/* <section id="testimonials" className="py-12 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-12">
            <Badge variant="secondary">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Loved by IELTS Centers Worldwide
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "Sarah Johnson",
                role: "Director, Cambridge IELTS Center",
                content:
                  "This LMS has transformed how we manage our students. The analytics help us identify areas for improvement instantly.",
                rating: 5,
              },
              {
                name: "Michael Chen",
                role: "IELTS Instructor",
                content:
                  "The exercise builder is incredible. I can create custom practice tests that perfectly match my students' needs.",
                rating: 5,
              },
              {
                name: "Emma Williams",
                role: "Academic Coordinator",
                content:
                  "Student progress tracking has never been easier. Parents love the detailed reports we can now provide.",
                rating: 5,
              },
            ].map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section> */}

      {/* Pricing Section */}
      <section id="pricing" className="py-12 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-12">
            <Badge variant="secondary">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your teaching center's needs. All plans
              include a 14-day free trial.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: "Basic",
                price: "$29",
                period: "/month",
                description: "Perfect for new teaching centers",
                features: [
                  "Up to 30 students",
                  "Basic analytics",
                  "Exercise builder",
                  "Email support",
                ],
                popular: false,
              },
              {
                name: "Growth",
                price: "$79",
                period: "/month",
                description: "Ideal for established centers",
                features: [
                  "Up to 100 students",
                  "Advanced analytics",
                  "Custom branding",
                  "Priority support",
                  "API access",
                ],
                popular: true,
              },
              {
                name: "Premium",
                price: "$149",
                period: "/month",
                description: "For expanding centers",
                features: [
                  "Up to 250 students",
                  "White-label solution",
                  "Dedicated support",
                  "Custom integrations",
                  "Advanced reporting",
                ],
                popular: false,
              },
            ].map((plan, index) => (
              <Card
                key={index}
                className={`relative ${plan.popular ? "border-primary shadow-lg" : "border-border"}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold">
                      {plan.price}
                      <span className="text-lg font-normal text-muted-foreground">
                        {plan.period}
                      </span>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="http://localhost:5173" className="block">
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                    >
                      Start Free Trial
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-6 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to Transform Your IELTS Teaching Center?
            </h2>
            <p className="text-lg opacity-90">
              Join hundreds of small and medium centers who are using IELTS Nook
              to deliver exceptional education.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="http://localhost:5173">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  Start Your Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-primary-foreground bg-primary text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              >
                Schedule a Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">IELTS Nook</h3>
              <p className="text-sm text-muted-foreground">
                The complete learning management system designed specifically
                for small and medium IELTS teaching centers.
              </p>
              <div className="flex space-x-4">
                <Button variant="ghost" size="icon">
                  <Globe className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="#features"
                    className="hover:text-primary transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="hover:text-primary transition-colors"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    API
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Integrations
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Status
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Privacy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 IELTS Nook. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
