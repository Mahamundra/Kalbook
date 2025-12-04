"use client";

export default function LaptopBanner() {
  return (
    <section className="bg-gradient-to-b from-gray-50 to-white py-16 md:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center min-h-[500px]">
          <div className="monitor-container">
            <div className="monitor">
              <div className="monitor-screen">
                <div className="screen-content">
                  <div className="screen-glow"></div>
                </div>
              </div>
              <div className="monitor-stand">
                <div className="stand-base"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

