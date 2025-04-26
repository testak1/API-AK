    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-600 bg-clip-text text-transparent">
          AK-TUNING
        </h1>
      </div>

      {/* SELECTORS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
        {/* Brand, Model, Year, Engine selectors exactly as you already have */}
        {/* Keep them as they are, no changes needed here */}
      </div>

      {/* STAGES */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : stages.length > 0 ? (
        <div className="space-y-6">
          {stages.map((stage) => {
            const allOptions = getAllAktPlusOptions(stage);
            const isExpanded = expandedStages[stage.name] ?? false;

            return (
              <div key={stage.name} className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                <button onClick={() => toggleStage(stage.name)} className="w-full p-6 text-left">
                  {/* Header with brand logo and stage info */}
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6">
                    {/* Stage description */}
                    {renderStageDescription(stage)}

                    {/* Dyno Chart Block */}
                    <div className="relative bg-gray-900 rounded-lg p-4 h-[480px] mb-8">
                      {/* Left Top Block */}
                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-0.5 bg-red-500" />
                          <span className="text-white text-sm">ORG HK: {stage.origHk}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-0.5 bg-red-500" />
                          <span className="text-white text-sm">Max HK: {stage.tunedHk}</span>
                        </div>
                      </div>

                      {/* Right Top Block */}
                      <div className="absolute top-4 right-4 flex flex-col gap-2 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-white text-sm">ORG NM: {stage.origNm}</span>
                          <div className="w-4 h-0.5 bg-blue-500" />
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-white text-sm">Max NM: {stage.tunedNm}</span>
                          <div className="w-4 h-0.5 bg-blue-500" />
                        </div>
                      </div>

                      {/* Dyno Chart */}
                      <Line
                        data={{
                          labels: ['2000', '3000', '4000', '5000', '6000', '7000'],
                          datasets: [
                            {
                              label: '',
                              data: generateDynoCurve(stage.origHk, true),
                              borderColor: 'red',
                              backgroundColor: 'transparent',
                              borderWidth: 2,
                              borderDash: [5, 5],
                              tension: 0.3,
                              pointRadius: 0,
                              yAxisID: 'hp',
                            },
                            {
                              label: '',
                              data: generateDynoCurve(stage.tunedHk, true),
                              borderColor: 'red',
                              backgroundColor: 'transparent',
                              borderWidth: 3,
                              tension: 0.4,
                              pointRadius: 0,
                              yAxisID: 'hp',
                            },
                            {
                              label: '',
                              data: generateDynoCurve(stage.origNm, false),
                              borderColor: 'blue',
                              backgroundColor: 'transparent',
                              borderWidth: 2,
                              borderDash: [5, 5],
                              tension: 0.3,
                              pointRadius: 0,
                              yAxisID: 'nm',
                            },
                            {
                              label: '',
                              data: generateDynoCurve(stage.tunedNm, false),
                              borderColor: 'blue',
                              backgroundColor: 'transparent',
                              borderWidth: 3,
                              tension: 0.4,
                              pointRadius: 0,
                              yAxisID: 'nm',
                            },
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false // <--- IMPORTANT! Hide native legend
                            },
                            tooltip: {
                              mode: 'index',
                              intersect: false,
                            }
                          },
                          scales: {
                            hp: {
                              type: 'linear',
                              display: true,
                              position: 'left',
                              title: {
                                display: true,
                                text: 'Effekt (HK)',
                                color: 'white',
                                font: { size: 14 },
                              },
                              ticks: {
                                color: '#9CA3AF'
                              },
                              grid: {
                                color: 'rgba(255,255,255,0.1)'
                              }
                            },
                            nm: {
                              type: 'linear',
                              display: true,
                              position: 'right',
                              title: {
                                display: true,
                                text: 'Vridmoment (Nm)',
                                color: 'white',
                                font: { size: 14 },
                              },
                              ticks: {
                                color: '#9CA3AF'
                              },
                              grid: {
                                drawOnChartArea: false,
                              }
                            },
                            x: {
                              title: {
                                display: true,
                                text: 'RPM',
                                color: '#E5E7EB',
                                font: { size: 14 }
                              },
                              ticks: {
                                color: '#9CA3AF'
                              },
                              grid: {
                                color: 'rgba(255,255,255,0.1)'
                              }
                            }
                          },
                          interaction: {
                            intersect: false,
                            mode: 'index',
                          }
                        }}
                        plugins={[watermarkPlugin]}
                      />
                    </div>

                    {/* Chart footnote */}
                    <div className="text-center text-white text-sm">
                      <p>(Simulerad effektkurva)</p>
                    </div>

                    {/* Contact Button */}
                    <div className="mt-6 mb-10 flex justify-center">
                      <button
                        onClick={() => handleBookNow(stage.name)}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-colors"
                      >
                        📩 KONTAKT
                      </button>
                    </div>

                    {/* Optional: AKT+ options section */}
                    {allOptions.length > 0 && (
                      <div className="mt-8">
                        {/* AKT+ Options */}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800 rounded-xl">
          <p className="text-white">EXTRA INFO RUTA KANSKE?</p>
        </div>
      )}

      {/* Contact Modal */}
      <ContactModal
        isOpen={contactModalData.isOpen}
        onClose={() => setContactModalData({ isOpen: false, stageOrOption: '' })}
        selectedVehicle={{
          brand: selected.brand,
          model: selected.model,
          year: selected.year,
          engine: selected.engine,
        }}
        stageOrOption={contactModalData.stageOrOption}
      />
    </div>
  );
}

return (
  <div className="max-w-5xl mx-auto p-4 md:p-8">
    <div className="text-center mb-8">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-600 bg-clip-text text-transparent">
        AK-TUNING
      </h1>
    </div>

    {/* Dropdown selectors */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
      {/* Brand, Model, Year, Engine selectors */}
      {/* KEEP your existing selectors here without changes */}
    </div>

    {/* Main Content */}
    {isLoading ? (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    ) : stages.length > 0 ? (
      <div className="space-y-6">
        {stages.map((stage) => {
          const allOptions = getAllAktPlusOptions(stage);
          const isExpanded = expandedStages[stage.name] ?? false;

          return (
            <div key={stage.name} className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
              <button onClick={() => toggleStage(stage.name)} className="w-full p-6 text-left">
                {/* Stage Header (engine name, stage name, price badge) */}
                {/* You can keep your previous header button code */}
              </button>

              {isExpanded && (
                <div className="px-6 pb-6">
                  {/* Stage Description */}
                  {renderStageDescription(stage)}

                  {/* Dyno Chart Section */}
                  <div className="relative bg-gray-900 rounded-lg p-4 h-[480px] mb-8">
                    {/* Left Top Legend (HK) */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-red-500" />
                        <span className="text-white text-sm">ORG HK: {stage.origHk}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-red-500" />
                        <span className="text-white text-sm">Max HK: {stage.tunedHk}</span>
                      </div>
                    </div>

                    {/* Right Top Legend (NM) */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-white text-sm">ORG NM: {stage.origNm}</span>
                        <div className="w-4 h-0.5 bg-blue-500" />
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-white text-sm">Max NM: {stage.tunedNm}</span>
                        <div className="w-4 h-0.5 bg-blue-500" />
                      </div>
                    </div>

                    {/* Chart */}
                    <Line
                      data={{
                        labels: ['2000', '3000', '4000', '5000', '6000', '7000'],
                        datasets: [
                          {
                            label: '',
                            data: generateDynoCurve(stage.origHk, true),
                            borderColor: 'red',
                            backgroundColor: 'transparent',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            tension: 0.3,
                            pointRadius: 0,
                            yAxisID: 'hp',
                          },
                          {
                            label: '',
                            data: generateDynoCurve(stage.tunedHk, true),
                            borderColor: 'red',
                            backgroundColor: 'transparent',
                            borderWidth: 3,
                            tension: 0.4,
                            pointRadius: 0,
                            yAxisID: 'hp',
                          },
                          {
                            label: '',
                            data: generateDynoCurve(stage.origNm, false),
                            borderColor: 'blue',
                            backgroundColor: 'transparent',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            tension: 0.3,
                            pointRadius: 0,
                            yAxisID: 'nm',
                          },
                          {
                            label: '',
                            data: generateDynoCurve(stage.tunedNm, false),
                            borderColor: 'blue',
                            backgroundColor: 'transparent',
                            borderWidth: 3,
                            tension: 0.4,
                            pointRadius: 0,
                            yAxisID: 'nm',
                          },
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: { mode: 'index', intersect: false },
                        },
                        scales: {
                          hp: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: { display: true, text: 'Effekt (HK)', color: 'white', font: { size: 14 } },
                            ticks: { color: '#9CA3AF' },
                            grid: { color: 'rgba(255,255,255,0.1)' }
                          },
                          nm: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: { display: true, text: 'Vridmoment (Nm)', color: 'white', font: { size: 14 } },
                            ticks: { color: '#9CA3AF' },
                            grid: { drawOnChartArea: false }
                          },
                          x: {
                            title: { display: true, text: 'RPM', color: '#E5E7EB', font: { size: 14 } },
                            ticks: { color: '#9CA3AF' },
                            grid: { color: 'rgba(255,255,255,0.1)' }
                          }
                        },
                        interaction: { intersect: false, mode: 'index' }
                      }}
                      plugins={[watermarkPlugin]}
                    />
                  </div>

                  {/* Chart footnote */}
                  <div className="text-center text-white text-sm">
                    <p>(Simulerad effektkurva)</p>
                  </div>

                  {/* Book Now button */}
                  <div className="mt-6 mb-10 flex justify-center">
                    <button
                      onClick={() => handleBookNow(stage.name)}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-colors"
                    >
                      📩 KONTAKT
                    </button>
                  </div>

                  {/* Optional AKT+ options section */}
                  {allOptions.length > 0 && (
                    <div className="mt-8">
                      {/* Your AKT+ grid, optional */}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    ) : (
      <div className="text-center py-12 bg-gray-800 rounded-xl">
        <p className="text-white">EXTRA INFO RUTA KANSKE?</p>
      </div>
    )}

    {/* Contact Modal */}
    <ContactModal
      isOpen={contactModalData.isOpen}
      onClose={() => setContactModalData({ isOpen: false, stageOrOption: '' })}
      selectedVehicle={{
        brand: selected.brand,
        model: selected.model,
        year: selected.year,
        engine: selected.engine,
      }}
      stageOrOption={contactModalData.stageOrOption}
    />
  </div>
);
