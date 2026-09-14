import React from 'react'
import { PageShell } from '../components/layout/PageShell'
import { PageReveal } from '../components/motion/PageReveal'

export const Architecture: React.FC = () => {
  return (
    <PageReveal>
      {({ bgReady, headerReady, contentReady }) => (
        <div className="relative w-full min-h-[calc(100vh-56px)] bg-[#060B12] text-[#C7D2DA] overflow-y-auto">
          
          {/* Beat 1: Architecture Blueprint Background Texture (8% opacity, duotone) */}
          <div
            className={`fixed inset-0 pointer-events-none transition-opacity duration-300 ${
              bgReady ? 'opacity-8' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url('/assets/generated/architecture-blueprint-bg.jpg')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />

          <PageShell className="relative z-10 pt-16 pb-20 flex flex-col gap-8">

            {/* Beat 2: Header Block (blur-in + slide up as one unit) */}
            <section 
              className={`border-b border-[#1C2C3D] pb-6 transition-all duration-500 ease-out ${
                headerReady 
                  ? 'opacity-100 translate-y-0 blur-none' 
                  : 'opacity-0 translate-y-3 blur-[8px]'
              }`}
            >
              <div className="font-mono text-xs text-[#5C7086] uppercase tracking-wider mb-1">
                System Design & Model Topology · Figure 1
              </div>
              <h1 className="font-display text-4xl lg:text-5xl font-normal text-[#EDF2F5] tracking-tight">
                AntarBodh Neural Processing Pipeline
              </h1>
              <p className="font-body text-sm text-[#5C7086] mt-2 max-w-2xl leading-relaxed">
                Multi-modal satellite surface observations are ingested, quality-controlled, and mapped onto a 14-channel tensor with explicit observation validity masks, driving a 2D ResNet-style Fully Convolutional Network to reconstruct 15 subsurface temperature levels.
              </p>
            </section>

            {/* Beat 3: Content Body (Technical Diagram & Specifications) */}
            <div 
              className={`flex flex-col gap-8 transition-all duration-400 ease-out ${
                contentReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}
            >
              {/* Section: Technical Diagram (Scientific Paper Style) */}
              <section className="bg-[#0A121C] border border-[#1C2C3D] p-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-[760px] flex flex-col items-center">
                  
                  {/* Stage 1: Surface Inputs */}
                  <div className="w-full instrument-card p-5 text-center">
                    <div className="font-mono text-xs text-[#E8642F] uppercase tracking-wider mb-1 font-semibold">
                      Multi-Sensor Surface Observations
                    </div>
                    <div className="font-mono text-sm text-[#EDF2F5] font-medium">
                      SST &nbsp;·&nbsp; SSS &nbsp;·&nbsp; SSH (SLA) &nbsp;·&nbsp; Currents (U/V) &nbsp;·&nbsp; Winds (U/V)
                    </div>
                    <div className="font-mono text-[11px] text-[#5C7086] mt-1">
                      Copernicus Marine Satellite L4 & Numerical Altimetry (0.25° Common Grid)
                    </div>
                  </div>

                  {/* Connecting Pulse Connector 1 (Delay: 300ms) */}
                  <div className="flex flex-col items-center my-2.5 relative h-9 w-10">
                    <svg width="24" height="36" viewBox="0 0 24 36" fill="none" className="overflow-visible">
                      <line x1="12" y1="0" x2="12" y2="28" stroke="#1C2C3D" strokeWidth="2" />
                      <line x1="12" y1="0" x2="12" y2="28" stroke="#5C7086" strokeWidth="1.5" />
                      <polygon points="8,26 12,34 16,26" fill="#5C7086" />
                      {/* One-time traveling pulse */}
                      <line 
                        x1="12" y1="0" x2="12" y2="28" 
                        stroke="#E8642F" 
                        strokeWidth="2.5" 
                        className="pipeline-pulse-connector"
                        style={{ animationDelay: '300ms' }}
                      />
                    </svg>
                  </div>

                  {/* Stage 2: 14-Channel Input Contract */}
                  <div className="w-full instrument-card p-5 text-center">
                    <div className="font-mono text-xs text-[#3FA7C4] uppercase tracking-wider mb-1 font-semibold">
                      14-Channel Input Contract · Tensor Shape (B, 14, 60, 80)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 text-left font-mono text-xs">
                      <div className="bg-[#060B12] p-3 border border-[#1C2C3D]">
                        <span className="text-[#C7D2DA] block font-medium">Channels 0–6 (Normalized Values)</span>
                        <span className="text-[11px] text-[#5C7086]">Z-score normalized physical variables (train stats)</span>
                      </div>
                      <div className="bg-[#060B12] p-3 border border-[#1C2C3D]">
                        <span className="text-[#C7D2DA] block font-medium">Channels 7–13 (Validity Masks)</span>
                        <span className="text-[11px] text-[#5C7086]">Binary masks (1.0 = Observed, 0.0 = Missing / Outage)</span>
                      </div>
                    </div>
                  </div>

                  {/* Connecting Pulse Connector 2 (Delay: 450ms) */}
                  <div className="flex flex-col items-center my-2.5 relative h-9 w-10">
                    <svg width="24" height="36" viewBox="0 0 24 36" fill="none" className="overflow-visible">
                      <line x1="12" y1="0" x2="12" y2="28" stroke="#1C2C3D" strokeWidth="2" />
                      <line x1="12" y1="0" x2="12" y2="28" stroke="#5C7086" strokeWidth="1.5" />
                      <polygon points="8,26 12,34 16,26" fill="#5C7086" />
                      {/* One-time traveling pulse */}
                      <line 
                        x1="12" y1="0" x2="12" y2="28" 
                        stroke="#E8642F" 
                        strokeWidth="2.5" 
                        className="pipeline-pulse-connector"
                        style={{ animationDelay: '450ms' }}
                      />
                    </svg>
                  </div>

                  {/* Stage 3: Deep Neural Network Architecture */}
                  <div className="w-full instrument-card border-[#E8642F]/40 p-6 text-center relative">
                    <div className="font-mono text-xs text-[#E8642F] uppercase tracking-wider mb-1 font-semibold">
                      AntarBodh ResNet-FCN Architecture (3,371,663 Parameters)
                    </div>
                    <div className="font-body text-xs text-[#5C7086] mb-4">
                      No spatial pooling — preserves 60×80 horizontal resolution with multi-scale skip connections
                    </div>

                    <div className="flex flex-col gap-2.5 font-mono text-xs max-w-[560px] mx-auto text-left">
                      <div className="p-2.5 bg-[#060B12] border border-[#1C2C3D] flex justify-between">
                        <span className="text-[#EDF2F5]">Encoder 1 → 2 → 3</span>
                        <span className="text-[#5C7086]">Conv3×3 (64) → Conv3×3 (128) → Conv3×3 (256) + BN + ReLU</span>
                      </div>
                      <div className="p-2.5 bg-[#060B12] border border-[#1C2C3D] flex justify-between">
                        <span className="text-[#EDF2F5]">Bottleneck</span>
                        <span className="text-[#5C7086]">Conv3×3 (256 filters)</span>
                      </div>
                      <div className="p-2.5 bg-[#060B12] border border-[#1C2C3D] flex justify-between">
                        <span className="text-[#EDF2F5]">Decoder 3 → 2 → 1</span>
                        <span className="text-[#5C7086]">Skip Concatenation + Conv3×3 (128 → 64 → 64 filters)</span>
                      </div>
                      <div className="p-2.5 bg-[#060B12] border border-[#1C2C3D] flex justify-between">
                        <span className="text-[#EDF2F5]">Depth Head</span>
                        <span className="text-[#E8642F]">Conv1×1 (64) → ReLU → Conv1×1 (15 Depths)</span>
                      </div>
                    </div>
                  </div>

                  {/* Connecting Pulse Connector 3 (Delay: 600ms) */}
                  <div className="flex flex-col items-center my-2.5 relative h-9 w-10">
                    <svg width="24" height="36" viewBox="0 0 24 36" fill="none" className="overflow-visible">
                      <line x1="12" y1="0" x2="12" y2="28" stroke="#1C2C3D" strokeWidth="2" />
                      <line x1="12" y1="0" x2="12" y2="28" stroke="#5C7086" strokeWidth="1.5" />
                      <polygon points="8,26 12,34 16,26" fill="#5C7086" />
                      {/* One-time traveling pulse */}
                      <line 
                        x1="12" y1="0" x2="12" y2="28" 
                        stroke="#E8642F" 
                        strokeWidth="2.5" 
                        className="pipeline-pulse-connector"
                        style={{ animationDelay: '600ms' }}
                      />
                    </svg>
                  </div>

                  {/* Stage 4: 3D Subsurface Output */}
                  <div className="w-full instrument-card p-5 text-center">
                    <div className="font-mono text-xs text-[#4F9C6D] uppercase tracking-wider mb-1 font-semibold">
                      Reconstructed 3D Subsurface Temperature Field
                    </div>
                    <div className="font-mono text-sm text-[#EDF2F5] font-medium">
                      Output Tensor Shape: (B, 15, 60, 80)
                    </div>
                    <div className="font-mono text-xs text-[#5C7086] mt-1">
                      15 Canonical Standard Depths: 0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000 meters
                    </div>
                  </div>

                </div>
              </section>

              {/* Section: Specifications Table (Standardized gap-6 between cards in row) */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="instrument-card p-6 font-mono text-xs flex flex-col gap-3">
                  <h2 className="font-body text-xs text-[#5C7086] uppercase tracking-wider mb-1 font-semibold">
                    Optimization & Loss Function
                  </h2>
                  <div className="flex justify-between py-1.5 border-b border-[#1C2C3D]">
                    <span className="text-[#5C7086]">Criterion:</span>
                    <span className="text-[#EDF2F5]">Masked MSE Loss</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#1C2C3D]">
                    <span className="text-[#5C7086]">Optimizer:</span>
                    <span className="text-[#EDF2F5]">AdamW (lr=1e-3, decay=1e-5)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#1C2C3D]">
                    <span className="text-[#5C7086]">LR Scheduler:</span>
                    <span className="text-[#EDF2F5]">ReduceLROnPlateau (factor=0.5)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#1C2C3D]">
                    <span className="text-[#5C7086]">Target Domain:</span>
                    <span className="text-[#EDF2F5]">GLORYS12V1 (2020–2023)</span>
                  </div>
                </div>

                <div className="instrument-card p-6 font-mono text-xs flex flex-col gap-3">
                  <h2 className="font-body text-xs text-[#5C7086] uppercase tracking-wider mb-1 font-semibold">
                    Sensor Graceful Degradation
                  </h2>
                  <p className="font-body text-xs text-[#5C7086] leading-relaxed">
                    When satellite instruments suffer unrecoverable anomalies or mission termination (e.g. SSS in 2025), the validity mask allows the network to bypass the corrupted input and rely on the remaining operational sensors without divergence.
                  </p>
                  <div className="mt-auto pt-3 border-t border-[#1C2C3D] flex items-center justify-between text-[#5C7086]">
                    <span>Mask Strategy:</span>
                    <span className="text-[#4F9C6D]">Binary Mask Multiplying</span>
                  </div>
                </div>
              </section>

            </div>

          </PageShell>
        </div>
      )}
    </PageReveal>
  )
}
