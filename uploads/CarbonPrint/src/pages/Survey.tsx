import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import Slider from '../components/Slider';
import DiscreteSlider from '../components/DiscreteSlider';

interface SurveyData {
  // Profile fields
  sex: number;
  bodyType: number;
  domain: number;
  area: number;
  country: number;
  
  // Numeric sliders
  vehicleMonthlyDistance: number;
  monthlyGroceryBill: number;
  tvPcHoursPerDay: number;
  internetHoursPerDay: number;
  newClothesPerMonth: number;
  wasteBagsPerMonth: number;
  flightFrequencyPerYear: number;
  showersPerWeek: number;
  
  // Discrete sliders
  diet: number;
  transport: number;
  vehicleType: number;
  wasteBagSize: number;
  energyEfficiency: number;
  heatingEnergySource: number;
  recycling: number;
  cookingWith: number;
}

const Survey: React.FC = () => {
  const [formData, setFormData] = useState<SurveyData>({
    sex: 0,
    bodyType: 1,
    domain: 0,
    area: 1,
    country: 0,
    vehicleMonthlyDistance: 500,
    monthlyGroceryBill: 300,
    tvPcHoursPerDay: 4,
    internetHoursPerDay: 6,
    newClothesPerMonth: 2,
    wasteBagsPerMonth: 8,
    flightFrequencyPerYear: 2,
    showersPerWeek: 7,
    diet: 2,
    transport: 2,
    vehicleType: 2,
    wasteBagSize: 1,
    energyEfficiency: 1,
    heatingEnergySource: 1,
    recycling: 1,
    cookingWith: 2,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Survey Data:', JSON.stringify(formData, null, 2));
    alert('Survey submitted! Check console for data.');
  };

  const dietOptions = ['Vegan', 'Vegetarian', 'Pescatarian', 'Mixed', 'Meat-heavy'];
  const transportOptions = ['Walk/Cycle', 'Public', 'Carpool', 'Motorbike', 'Car Solo'];
  const vehicleTypeOptions = ['None', 'EV', 'Hybrid', 'Petrol', 'Diesel'];
  const wasteBagSizeOptions = ['Small', 'Medium', 'Large'];
  const energyEfficiencyOptions = ['Poor', 'Average', 'Good', 'Excellent'];
  const heatingEnergyOptions = ['Coal', 'Gas', 'Electric', 'Renewable'];
  const recyclingOptions = ['None', 'Partial', 'Full'];
  const cookingWithOptions = ['Wood', 'Gas', 'Electric', 'Induction'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Carbon Footprint Survey
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Help us understand your lifestyle to provide personalized carbon footprint insights.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-100"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Profile Section */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DiscreteSlider
                  label="Sex"
                  value={formData.sex}
                  onChange={(value) => setFormData(prev => ({ ...prev, sex: value }))}
                  options={['Male', 'Female', 'Other']}
                  helpText="Biological sex for demographic analysis"
                />

                <DiscreteSlider
                  label="Body Type"
                  value={formData.bodyType}
                  onChange={(value) => setFormData(prev => ({ ...prev, bodyType: value }))}
                  options={['Underweight', 'Normal', 'Overweight', 'Obese']}
                  helpText="Body type affects metabolic carbon calculations"
                />

                <DiscreteSlider
                  label="Domain"
                  value={formData.domain}
                  onChange={(value) => setFormData(prev => ({ ...prev, domain: value }))}
                  options={['Technology', 'Healthcare', 'Education', 'Finance', 'Manufacturing', 'Other']}
                  helpText="Your primary work or study domain"
                />

                <DiscreteSlider
                  label="Area Type"
                  value={formData.area}
                  onChange={(value) => setFormData(prev => ({ ...prev, area: value }))}
                  options={['Urban', 'Suburban', 'Rural']}
                  helpText="Type of area where you live"
                />

                <div className="md:col-span-2">
                  <DiscreteSlider
                    label="Country"
                    value={formData.country}
                    onChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
                    options={['United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Australia', 'Other']}
                    helpText="Your country of residence"
                  />
                </div>
              </div>
            </div>

            {/* Lifestyle Sliders */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Lifestyle & Consumption</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Slider
                  label="Vehicle Monthly Distance"
                  value={formData.vehicleMonthlyDistance}
                  onChange={(value) => setFormData(prev => ({ ...prev, vehicleMonthlyDistance: value }))}
                  min={0}
                  max={2000}
                  unit=" km"
                  helpText="How many kilometers do you drive per month?"
                />

                <Slider
                  label="Monthly Grocery Bill"
                  value={formData.monthlyGroceryBill}
                  onChange={(value) => setFormData(prev => ({ ...prev, monthlyGroceryBill: value }))}
                  min={0}
                  max={1000}
                  unit=" $"
                  helpText="Your average monthly spending on groceries"
                />

                <Slider
                  label="TV/PC Hours per Day"
                  value={formData.tvPcHoursPerDay}
                  onChange={(value) => setFormData(prev => ({ ...prev, tvPcHoursPerDay: value }))}
                  min={0}
                  max={12}
                  unit=" hrs"
                  helpText="Daily screen time for entertainment and work"
                />

                <Slider
                  label="Internet Hours per Day"
                  value={formData.internetHoursPerDay}
                  onChange={(value) => setFormData(prev => ({ ...prev, internetHoursPerDay: value }))}
                  min={0}
                  max={12}
                  unit=" hrs"
                  helpText="Daily internet usage across all devices"
                />

                <Slider
                  label="New Clothes per Month"
                  value={formData.newClothesPerMonth}
                  onChange={(value) => setFormData(prev => ({ ...prev, newClothesPerMonth: value }))}
                  min={0}
                  max={10}
                  unit=" items"
                  helpText="Average number of new clothing items purchased monthly"
                />

                <Slider
                  label="Waste Bags per Month"
                  value={formData.wasteBagsPerMonth}
                  onChange={(value) => setFormData(prev => ({ ...prev, wasteBagsPerMonth: value }))}
                  min={0}
                  max={30}
                  unit=" bags"
                  helpText="Number of waste bags you dispose of monthly"
                />

                <Slider
                  label="Flight Frequency per Year"
                  value={formData.flightFrequencyPerYear}
                  onChange={(value) => setFormData(prev => ({ ...prev, flightFrequencyPerYear: value }))}
                  min={0}
                  max={20}
                  unit=" flights"
                  helpText="Number of flights taken annually"
                />

                <Slider
                  label="Showers per Week"
                  value={formData.showersPerWeek}
                  onChange={(value) => setFormData(prev => ({ ...prev, showersPerWeek: value }))}
                  min={0}
                  max={21}
                  unit=" showers"
                  helpText="Number of showers taken per week"
                />
              </div>
            </div>

            {/* Categorical Sliders */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Preferences & Choices</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <DiscreteSlider
                  label="Diet"
                  value={formData.diet}
                  onChange={(value) => setFormData(prev => ({ ...prev, diet: value }))}
                  options={dietOptions}
                  helpText="Your primary dietary preference"
                />

                <DiscreteSlider
                  label="Primary Transport"
                  value={formData.transport}
                  onChange={(value) => setFormData(prev => ({ ...prev, transport: value }))}
                  options={transportOptions}
                  helpText="Most common method of transportation"
                />

                <DiscreteSlider
                  label="Vehicle Type"
                  value={formData.vehicleType}
                  onChange={(value) => setFormData(prev => ({ ...prev, vehicleType: value }))}
                  options={vehicleTypeOptions}
                  helpText="Type of vehicle you own or use most often"
                />

                <DiscreteSlider
                  label="Waste Bag Size"
                  value={formData.wasteBagSize}
                  onChange={(value) => setFormData(prev => ({ ...prev, wasteBagSize: value }))}
                  options={wasteBagSizeOptions}
                  helpText="Average size of waste bags you use"
                />

                <DiscreteSlider
                  label="Energy Efficiency"
                  value={formData.energyEfficiency}
                  onChange={(value) => setFormData(prev => ({ ...prev, energyEfficiency: value }))}
                  options={energyEfficiencyOptions}
                  helpText="Energy efficiency rating of your home"
                />

                <DiscreteSlider
                  label="Heating Energy Source"
                  value={formData.heatingEnergySource}
                  onChange={(value) => setFormData(prev => ({ ...prev, heatingEnergySource: value }))}
                  options={heatingEnergyOptions}
                  helpText="Primary energy source for heating"
                />

                <DiscreteSlider
                  label="Recycling"
                  value={formData.recycling}
                  onChange={(value) => setFormData(prev => ({ ...prev, recycling: value }))}
                  options={recyclingOptions}
                  helpText="How much do you recycle?"
                />

                <DiscreteSlider
                  label="Cooking With"
                  value={formData.cookingWith}
                  onChange={(value) => setFormData(prev => ({ ...prev, cookingWith: value }))}
                  options={cookingWithOptions}
                  helpText="Primary cooking energy source"
                />
              </div>
            </div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center pt-8"
            >
              <button
                type="submit"
                className="group bg-gray-900 text-white px-12 py-4 rounded-2xl font-semibold text-lg hover:bg-gray-800 transition-all duration-300 flex items-center space-x-3 shadow-lg hover:shadow-xl mx-auto"
              >
                <span>Submit Survey</span>
                <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Survey;